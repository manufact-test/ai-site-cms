FROM php:8.3-apache-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libsqlite3-dev \
    && docker-php-ext-install mbstring pdo_mysql pdo_sqlite \
    && a2enmod dir rewrite \
    && rm -rf /var/lib/apt/lists/*
COPY stage3/tests/apache-smoke/000-default.conf /etc/apache2/sites-available/000-default.conf
