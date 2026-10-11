FROM amazonlinux:2023

WORKDIR /var/www/html

COPY ./app .
# Make the entrypoint readable/executable at runtime, but not writable in the image.
COPY --chmod=555 ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN dnf install -y iproute httpd php php-fpm \
              && dnf clean all

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
