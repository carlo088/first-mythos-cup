FROM nousresearch/hermes-agent:latest

USER root

# First-boot seeds. Runtime state lives on the Fly volume at /opt/data.
COPY hermes/config.yaml /opt/hermes/cli-config.yaml.example
COPY hermes/SOUL.md /opt/hermes/docker/SOUL.md
COPY hermes/skills/first-mythos-cup /opt/hermes/skills/project/first-mythos-cup
COPY --chmod=0755 hermes/bootstrap_gateway.mjs /opt/hermes/bin/first-mythos-cup-gateway
