FROM nousresearch/hermes-agent:latest

USER root

ARG FLYCTL_VERSION=0.4.78
ARG SUPABASE_CLI_VERSION=2.111.0
ARG VERCEL_CLI_VERSION=48.1.0

# Persistent-agent operations: source control plus Vercel/Fly deployment tools.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git gh \
    && curl -fsSL "https://github.com/superfly/flyctl/releases/download/v${FLYCTL_VERSION}/flyctl_${FLYCTL_VERSION}_Linux_x86_64.tar.gz" \
      | tar -xz -C /usr/local/bin flyctl \
    && curl -fsSL "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_linux_amd64.tar.gz" \
      | tar -xz -C /usr/local/bin supabase \
    && npm install --global "vercel@${VERCEL_CLI_VERSION}" \
    && git config --system --add safe.directory /opt/data/workspace/first-mythos-cup \
    && git config --system user.name "Eolo Hermes" \
    && git config --system user.email "eolo-hermes@users.noreply.github.com" \
    && rm -rf /var/lib/apt/lists/*

# First-boot seeds. Runtime state lives on the Fly volume at /opt/data.
COPY hermes/config.yaml /opt/hermes/cli-config.yaml.example
COPY hermes/SOUL.md /opt/hermes/docker/SOUL.md
COPY hermes/skills/first-mythos-cup /opt/hermes/skills/project/first-mythos-cup
COPY --chmod=0755 hermes/bootstrap_gateway.mjs /opt/hermes/bin/first-mythos-cup-gateway
