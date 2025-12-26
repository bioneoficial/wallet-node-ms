#!/bin/bash

sleep 5

mongosh --host mongo:27017 -u mongo -p mongo --authenticationDatabase admin <<EOF
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "mongo:27017" }]
})
EOF
