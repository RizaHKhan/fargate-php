FROM amazonlinux:2023

WORKDIR /var/www/html

COPY . .
# Make the entrypoint readable/executable at runtime, but not writable in the image.
COPY --chmod=555 ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN dnf install -y httpd php php-fpm \
              && dnf clean all

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
