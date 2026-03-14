# =============================================================================
# EJBCA PKI Lab — Makefile
# One command to rule them all.
#
# USAGE:
#   make help                       Show this help
#   make up                         Start the lab (dev mode)
#   make up-vps                     Start in VPS/production mode
#   make down                       Stop the lab
#   make init                       Full PKI bootstrap (3-tier hierarchy)
#   make init-profile CLIENT=iot    Load profiles for a specific client
#   make client CLIENT=acme-corp    Bootstrap a new client environment
#   make shell                      Open shell in EJBCA container
#   make logs                       Tail all container logs
#   make backup                     Backup all persistent data
#   make export CLIENT=acme-corp    Package client env for VPS deploy
#   make status                     Show container health
# =============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# --- Paths ---
DOCKER_DIR   := docker
PKI_DIR      := pki
SCRIPTS_DIR  := $(PKI_DIR)/scripts
CLIENTS_DIR  := clients
BACKUP_DIR   := backups

# --- Docker Compose ---
COMPOSE      := docker compose
COMPOSE_FILE := -f $(DOCKER_DIR)/docker-compose.yml
COMPOSE_VPS  := $(COMPOSE_FILE) -f $(DOCKER_DIR)/docker-compose.vps.yml

# --- Container name ---
EJBCA_CONTAINER := ejbca-node1

# --- Colors ---
CYAN  := \033[0;36m
GREEN := \033[0;32m
YELLOW:= \033[1;33m
RED   := \033[0;31m
NC    := \033[0m

# =============================================================================
.PHONY: help
help: ## Show available commands
	@echo ""
	@echo -e "$(CYAN)  EJBCA PKI Lab — Command Reference$(NC)"
	@echo -e "$(CYAN)  ====================================$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-28s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# STACK MANAGEMENT
# =============================================================================

.PHONY: up
up: _ensure-env ## Start the full stack in dev mode (exposes EJBCA ports)
	@echo -e "$(CYAN)▶ Starting EJBCA PKI Lab (dev)...$(NC)"
	@mkdir -p $(DOCKER_DIR)/data/ejbca $(DOCKER_DIR)/data/mariadb $(DOCKER_DIR)/data/nginx/logs
	$(COMPOSE) $(COMPOSE_FILE) --env-file $(DOCKER_DIR)/.env up -d
	@echo -e "$(GREEN)✓ Stack started. EJBCA UI: https://localhost:8443/ejbca/adminweb$(NC)"
	@echo -e "$(YELLOW)  Run 'make init' to bootstrap the 3-tier PKI hierarchy.$(NC)"

.PHONY: up-vps
up-vps: _ensure-env ## Start the full stack in VPS/production mode
	@echo -e "$(CYAN)▶ Starting EJBCA PKI Lab (VPS)...$(NC)"
	@mkdir -p $(DOCKER_DIR)/data/ejbca $(DOCKER_DIR)/data/mariadb $(DOCKER_DIR)/data/nginx/logs
	$(COMPOSE) $(COMPOSE_VPS) --env-file $(DOCKER_DIR)/.env up -d
	@echo -e "$(GREEN)✓ Stack started (VPS mode — EJBCA not directly exposed).$(NC)"

.PHONY: down
down: ## Stop and remove containers (data preserved)
	@echo -e "$(CYAN)▶ Stopping EJBCA PKI Lab...$(NC)"
	$(COMPOSE) $(COMPOSE_FILE) --env-file $(DOCKER_DIR)/.env down
	@echo -e "$(GREEN)✓ Stack stopped.$(NC)"

.PHONY: restart
restart: down up ## Restart the full stack

.PHONY: pull
pull: ## Pull latest container images
	$(COMPOSE) $(COMPOSE_FILE) pull

# =============================================================================
# PKI INITIALIZATION
# =============================================================================

.PHONY: init
init: _check-running ## Bootstrap the full 3-tier PKI hierarchy
	@echo -e "$(CYAN)▶ Initializing 3-tier PKI hierarchy...$(NC)"
	@bash $(SCRIPTS_DIR)/01-init-root-ca.sh
	@bash $(SCRIPTS_DIR)/02-init-policy-ca.sh
	@bash $(SCRIPTS_DIR)/03-init-issuing-cas.sh
	@bash $(SCRIPTS_DIR)/04-init-profiles.sh
	@echo -e "$(GREEN)✓ PKI hierarchy initialized.$(NC)"
	@echo -e "$(YELLOW)  SuperAdmin cert: docker exec $(EJBCA_CONTAINER) cat /tmp/superadmin.p12$(NC)"

.PHONY: init-root
init-root: _check-running ## Initialize Root CA only
	@bash $(SCRIPTS_DIR)/01-init-root-ca.sh

.PHONY: init-policy
init-policy: _check-running ## Initialize Policy CA (requires Root CA)
	@bash $(SCRIPTS_DIR)/02-init-policy-ca.sh

.PHONY: init-issuing
init-issuing: _check-running ## Initialize Issuing CAs (requires Policy CA)
	@bash $(SCRIPTS_DIR)/03-init-issuing-cas.sh

.PHONY: init-profiles
init-profiles: _check-running ## Load certificate profiles
	@bash $(SCRIPTS_DIR)/04-init-profiles.sh $(PROFILE)

# =============================================================================
# CLIENT MANAGEMENT
# =============================================================================

.PHONY: client
client: ## Create a new client environment (CLIENT=<name> required)
ifndef CLIENT
	$(error CLIENT is not set. Usage: make client CLIENT=acme-corp TEMPLATE=enterprise)
endif
	@TEMPLATE="${TEMPLATE:-enterprise}"; \
	echo -e "$(CYAN)▶ Creating client: $(CLIENT) (template: $$TEMPLATE)...$(NC)"; \
	if [ -d "$(CLIENTS_DIR)/$(CLIENT)" ]; then \
		echo -e "$(YELLOW)  Client '$(CLIENT)' already exists. Edit: $(CLIENTS_DIR)/$(CLIENT)/.env$(NC)"; \
	else \
		cp -r $(CLIENTS_DIR)/template-$$TEMPLATE $(CLIENTS_DIR)/$(CLIENT); \
		sed -i 's/CLIENT_ID=.*/CLIENT_ID="$(CLIENT)"/' $(CLIENTS_DIR)/$(CLIENT)/.env; \
		echo -e "$(GREEN)✓ Client created: $(CLIENTS_DIR)/$(CLIENT)/.env$(NC)"; \
		echo -e "$(YELLOW)  1. Edit: $(CLIENTS_DIR)/$(CLIENT)/.env$(NC)"; \
		echo -e "$(YELLOW)  2. Run:  make deploy CLIENT=$(CLIENT)$(NC)"; \
	fi

.PHONY: deploy
deploy: ## Deploy a client environment (CLIENT=<name> required)
ifndef CLIENT
	$(error CLIENT is not set. Usage: make deploy CLIENT=acme-corp)
endif
	@echo -e "$(CYAN)▶ Deploying client: $(CLIENT)...$(NC)"
	@CLIENT_ENV="$(CLIENTS_DIR)/$(CLIENT)/.env"; \
	if [ ! -f "$$CLIENT_ENV" ]; then \
		echo -e "$(RED)✗ Client not found: $$CLIENT_ENV$(NC)"; \
		exit 1; \
	fi; \
	cp $$CLIENT_ENV $(DOCKER_DIR)/.env
	$(MAKE) up
	$(MAKE) init
	@echo -e "$(GREEN)✓ Client '$(CLIENT)' deployed.$(NC)"

.PHONY: list-clients
list-clients: ## List all configured clients
	@echo -e "$(CYAN)Configured clients:$(NC)"
	@for d in $(CLIENTS_DIR)/*/; do \
		name=$$(basename $$d); \
		[[ "$$name" == template-* ]] && continue; \
		echo -e "  $(GREEN)●$(NC) $$name"; \
	done

# =============================================================================
# OPERATIONS & MAINTENANCE
# =============================================================================

.PHONY: shell
shell: _check-running ## Open a shell inside the EJBCA container
	docker exec -it $(EJBCA_CONTAINER) bash

.PHONY: ejbca-cli
ejbca-cli: _check-running ## Run EJBCA CLI (CMD="ca list" make ejbca-cli)
	docker exec -it $(EJBCA_CONTAINER) /opt/keyfactor/bin/ejbca.sh $(CMD)

.PHONY: logs
logs: ## Tail all container logs
	$(COMPOSE) $(COMPOSE_FILE) logs -f

.PHONY: logs-ejbca
logs-ejbca: ## Tail EJBCA container logs only
	docker logs -f $(EJBCA_CONTAINER)

.PHONY: status
status: ## Show container health status
	@echo -e "$(CYAN)Container status:$(NC)"
	$(COMPOSE) $(COMPOSE_FILE) ps
	@echo ""
	@echo -e "$(CYAN)EJBCA health check:$(NC)"
	@docker exec $(EJBCA_CONTAINER) \
		curl -sk https://localhost:8443/ejbca/publicweb/healthcheck/ejbcaok 2>/dev/null \
		|| echo -e "$(RED)EJBCA not responding$(NC)"

.PHONY: ca-list
ca-list: _check-running ## List all CAs in EJBCA
	docker exec $(EJBCA_CONTAINER) /opt/keyfactor/bin/ejbca.sh ca list

.PHONY: crl-update
crl-update: _check-running ## Update CRLs for all CAs
	docker exec $(EJBCA_CONTAINER) /opt/keyfactor/bin/ejbca.sh ca createcrl --all

.PHONY: superadmin-p12
superadmin-p12: _check-running ## Extract SuperAdmin PKCS12 to ./superadmin.p12
	@echo -e "$(CYAN)▶ Extracting SuperAdmin credentials...$(NC)"
	docker cp $(EJBCA_CONTAINER):/opt/keyfactor/p12/superadmin.p12 ./superadmin.p12 2>/dev/null || \
		docker exec $(EJBCA_CONTAINER) find / -name "superadmin.p12" 2>/dev/null | head -1 | \
		xargs -I{} docker cp $(EJBCA_CONTAINER):{} ./superadmin.p12
	@echo -e "$(GREEN)✓ Saved to: ./superadmin.p12$(NC)"
	@echo -e "$(YELLOW)  Import into Firefox → Privacy → Certificates → Import$(NC)"

# =============================================================================
# BACKUP & EXPORT
# =============================================================================

.PHONY: backup
backup: ## Backup EJBCA data and database
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	BACKUP_PATH="$(BACKUP_DIR)/backup_$$TIMESTAMP"; \
	echo -e "$(CYAN)▶ Creating backup: $$BACKUP_PATH$(NC)"; \
	mkdir -p $$BACKUP_PATH; \
	docker exec ejbca-database mysqldump \
		-u root -p$${DB_ROOT_PASSWORD} \
		--all-databases > $$BACKUP_PATH/ejbca_db.sql; \
	tar czf $$BACKUP_PATH/ejbca_data.tar.gz -C $(DOCKER_DIR)/data ejbca; \
	echo -e "$(GREEN)✓ Backup complete: $$BACKUP_PATH$(NC)"

.PHONY: export
export: ## Package client config for VPS deployment (CLIENT=<name>)
ifndef CLIENT
	$(error CLIENT is not set. Usage: make export CLIENT=acme-corp)
endif
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	EXPORT_PATH="$(BACKUP_DIR)/export_$(CLIENT)_$$TIMESTAMP"; \
	echo -e "$(CYAN)▶ Exporting client: $(CLIENT) to $$EXPORT_PATH...$(NC)"; \
	mkdir -p $$EXPORT_PATH; \
	cp -r $(DOCKER_DIR) $$EXPORT_PATH/; \
	cp $(CLIENTS_DIR)/$(CLIENT)/.env $$EXPORT_PATH/docker/.env; \
	cp -r $(PKI_DIR)/profiles $$EXPORT_PATH/pki_profiles; \
	cp -r $(PKI_DIR)/scripts $$EXPORT_PATH/pki_scripts; \
	tar czf $$EXPORT_PATH.tar.gz -C $(BACKUP_DIR) export_$(CLIENT)_$$TIMESTAMP; \
	rm -rf $$EXPORT_PATH; \
	echo -e "$(GREEN)✓ Export: $$EXPORT_PATH.tar.gz$(NC)"; \
	echo -e "$(YELLOW)  Transfer to VPS: scp $$EXPORT_PATH.tar.gz user@vps:~/$(NC)"; \
	echo -e "$(YELLOW)  On VPS: tar xzf <file>.tar.gz && cd docker && make up-vps && make init$(NC)"

# =============================================================================
# INTERNAL HELPERS
# =============================================================================

.PHONY: _ensure-env
_ensure-env:
	@if [ ! -f "$(DOCKER_DIR)/.env" ]; then \
		echo -e "$(YELLOW)⚠ No .env found. Copying from .env.example...$(NC)"; \
		cp $(DOCKER_DIR)/.env.example $(DOCKER_DIR)/.env; \
		echo -e "$(RED)✗ Edit $(DOCKER_DIR)/.env before proceeding!$(NC)"; \
		exit 1; \
	fi

.PHONY: _check-running
_check-running:
	@if ! docker ps --format '{{.Names}}' | grep -q "$(EJBCA_CONTAINER)"; then \
		echo -e "$(RED)✗ EJBCA container not running. Run 'make up' first.$(NC)"; \
		exit 1; \
	fi

.PHONY: clean
clean: down ## Remove all containers AND data volumes (DESTRUCTIVE)
	@echo -e "$(RED)⚠ This will destroy all PKI data. Press Ctrl+C to cancel...$(NC)"
	@sleep 5
	$(COMPOSE) $(COMPOSE_FILE) down -v
	rm -rf $(DOCKER_DIR)/data
	@echo -e "$(GREEN)✓ Clean complete.$(NC)"
