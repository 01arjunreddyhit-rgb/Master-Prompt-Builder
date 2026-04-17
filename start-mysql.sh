#!/bin/bash
export MYSQL_HOME=$PWD/.replit_mysql
export DATADIR=$MYSQL_HOME/data
mkdir -p $DATADIR
if [ ! -d "$DATADIR/mysql" ]; then
  mysqld --initialize-insecure --datadir=$DATADIR
fi
mysqld --datadir=$DATADIR --socket=$MYSQL_HOME/mysql.sock --port=3306 &
sleep 5
