FROM fluent/fluentd:v1.16-debian-1

# Switch to root to install plugins
USER root

# Install required plugins
RUN ["gem", "install", "fluent-plugin-elasticsearch", "--no-document"]

# Create buffer directory
RUN mkdir -p /var/log/fluentd-buffers && \
    chown -R fluent:fluent /var/log/fluentd-buffers

# Switch back to fluent user
USER fluent