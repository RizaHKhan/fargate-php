#!/bin/sh
set -e

echo "--php-fpm started--"

# PHP-FPM only passes environment variables to PHP when they are listed in the
# pool config. Add API_URL so app/index.php can read it with getenv('API_URL').
# The value comes from compose.yml locally and from the ECS task environment in AWS.
printf '\nenv[API_URL] = %s\n' "${API_URL:-}" >> /etc/php-fpm.d/www.conf

mkdir -p /run/php-fpm
php-fpm


exec /usr/sbin/httpd -DFOREGROUND
