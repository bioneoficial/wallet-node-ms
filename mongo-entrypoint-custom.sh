set -e

# Copy keyfile to ensure ownership and permissions are correct
cp /tmp/mongo-keyfile /etc/mongo-keyfile
chown mongodb:mongodb /etc/mongo-keyfile
chmod 400 /etc/mongo-keyfile

# Execute the original entrypoint with the keyFile argument
# Note: We don't need to repeat --replSet or --bind_ip_all here if we pass them as arguments to this script
exec docker-entrypoint.sh mongod --replSet rs0 --keyFile /etc/mongo-keyfile --bind_ip_all
