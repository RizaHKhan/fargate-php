#!/bin/sh
set -e

echo "--php-fpm started--"

mkdir -p /run/php-fpm
php-fpm


exec /usr/sbin/httpd -DFOREGROUND
