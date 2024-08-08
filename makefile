# Project Configuration
PROJECT_NAME = "netdefenders"
LOCAL_DEPLOY_DIR = "."

# ---------------------------------------
# For deploying docker containers locally
# ---------------------------------------
up:
	@docker compose -p $(PROJECT_NAME) \
					-f $(LOCAL_DEPLOY_DIR)/compose.yml \
					up --build -d

# ---------------------------------
# For tearing down local deployment
# ---------------------------------
down:
	@docker compose -p $(PROJECT_NAME) \
				    -f $(LOCAL_DEPLOY_DIR)/compose.yml \
				    down
