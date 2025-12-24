# Production REST API Deployment Guide

## Quick Deploy Checklist

### 1. Prerequisites
- [ ] Node.js 18+ installed
- [ ] Redis installed (optional but recommended)
- [ ] Domain name configured
- [ ] SSL certificate obtained
- [ ] Firewall configured (ports 80, 443, 3000)

### 2. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 3. Application Setup

```bash
# Clone or copy your project
cd /var/www
git clone <your-repo> dex-api
cd dex-api/rest-api

# Install dependencies
npm ci --production

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Create logs directory
mkdir -p logs

# Set proper permissions
sudo chown -R $USER:$USER /var/www/dex-api
```

### 4. Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the instructions provided

# Check status
pm2 status
pm2 logs
```

### 5. Nginx Configuration

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/dex-api

# Paste this configuration:
```

```nginx
upstream dex_api {
    least_conn;
    server localhost:3000;
    server localhost:3001;  # If using PM2 cluster mode
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Logging
    access_log /var/log/nginx/dex-api.access.log;
    error_log /var/log/nginx/dex-api.error.log;
    
    # Max request size
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://dex_api;
        proxy_http_version 1.1;
        
        # Proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://dex_api/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dex-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is set up automatically
# Test renewal
sudo certbot renew --dry-run
```

### 7. Docker Deployment (Alternative)

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Scale API instances
docker-compose up -d --scale api=3
```

### 8. Monitoring Setup

```bash
# Install monitoring tools
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 9. Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status
```

### 10. Environment Variables

Required production environment variables:

```bash
NODE_ENV=production
PORT=3000
RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
CHAIN_ID=1
POOL_MANAGER_ADDRESS=0x...
SWAP_ROUTER_ADDRESS=0x...
JWT_SECRET=your-secret-change-this
REDIS_ENABLED=true
REDIS_HOST=localhost
LOG_LEVEL=info
CORS_ORIGIN=https://yourdapp.com
```

### 11. Testing Production Deployment

```bash
# Health check
curl https://api.yourdomain.com/health

# API test
curl -H "X-API-Key: your-key" \
  https://api.yourdomain.com/api/v1/swap/quote \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn":"0x...",
    "tokenOut":"0x...",
    "amountIn":"1000000000000000000",
    "fee":3000
  }'
```

### 12. Maintenance Commands

```bash
# View logs
pm2 logs dex-api
tail -f logs/combined.log

# Restart application
pm2 restart dex-api

# Update application
git pull
npm install
pm2 restart dex-api

# Monitor resources
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/dex-api.access.log
sudo tail -f /var/log/nginx/dex-api.error.log
```

### 13. Backup Strategy

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/dex-api"

# Backup env file
cp /var/www/dex-api/rest-api/.env $BACKUP_DIR/.env.$DATE

# Backup logs
tar -czf $BACKUP_DIR/logs.$DATE.tar.gz /var/www/dex-api/rest-api/logs/

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

### 14. Security Hardening

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Install fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Regular updates
sudo apt update && sudo apt upgrade -y
```

### 15. Rollback Plan

```bash
# If deployment fails, rollback:
git checkout <previous-commit>
npm install
pm2 restart dex-api
```

## Cloud Platform Specific

### AWS EC2
- Use AWS Systems Manager for secrets
- Configure CloudWatch for logging
- Use ALB for load balancing
- Enable Auto Scaling

### Google Cloud
- Use Cloud Run for serverless
- Cloud SQL for database
- Cloud Logging and Monitoring
- Load Balancer with SSL

### DigitalOcean
- Use App Platform or Droplets
- Managed Redis
- Spaces for backups
- Load Balancer

## Checklist Complete ✅

- [ ] Server configured
- [ ] Application deployed
- [ ] PM2 running
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Firewall enabled
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Tested all endpoints
- [ ] Documentation updated
