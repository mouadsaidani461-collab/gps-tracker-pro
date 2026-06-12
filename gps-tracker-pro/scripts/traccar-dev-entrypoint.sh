#!/bin/sh
# Dev Traccar entrypoint — optional MySQL via MYSQL_* env vars.
# Requires CONFIG_USE_ENVIRONMENT_VARIABLES=true on the traccar service.
set -eu

if [ -n "${MYSQL_HOST:-}" ]; then
  export DATABASE_DRIVER="${DATABASE_DRIVER:-com.mysql.cj.jdbc.Driver}"
  export DATABASE_URL="${DATABASE_URL:-jdbc:mysql://${MYSQL_HOST}:3306/${MYSQL_DATABASE:-traccar}?allowPublicKeyRetrieval=true&useSSL=false&serverTimezone=UTC&allowMultiQueries=true&autoReconnect=true&useUnicode=yes&characterEncoding=UTF-8&sessionVariables=sql_mode=''}"
  export DATABASE_USER="${MYSQL_USER:-traccar}"
  export DATABASE_PASSWORD="${MYSQL_PASSWORD:?Set MYSQL_PASSWORD when MYSQL_HOST is configured}"
  echo "Traccar dev: using MySQL at ${MYSQL_HOST}/${MYSQL_DATABASE:-traccar}" >&2
else
  echo "Traccar dev: using embedded H2 (./data/database)" >&2
fi

JAVA="/opt/traccar/jre/bin/java"
if [ ! -x "$JAVA" ]; then
  echo "ERROR: bundled JRE not found at $JAVA" >&2
  exit 1
fi

cd /opt/traccar
# shellcheck disable=SC2086
exec "$JAVA" ${JAVA_OPTS:--Xms512m -Xmx512m} -jar tracker-server.jar conf/traccar.xml
