# CloudFront Setup Guide

This guide helps you set up CloudFront distribution for your S3-hosted frontend to enable HTTPS, custom domain, and global CDN caching.

## Prerequisites

- S3 bucket already set up with static website hosting
- AWS CLI configured
- Domain name (optional, for custom domain setup)
- SSL certificate (optional, for custom domain)

## Step 1: Create CloudFront Distribution

```bash
# Replace with your actual S3 bucket name and region
BUCKET_NAME="your-unique-bucket-name"
S3_WEBSITE_ENDPOINT="$BUCKET_NAME.s3-website.ap-south-1.amazonaws.com"

# Create distribution configuration file
cat > cloudfront-config.json << EOF
{
  "CallerReference": "$(date +%s)",
  "DefaultRootObject": "index.html",
  "Comment": "RocketryBox Frontend Distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-Website-$BUCKET_NAME",
        "DomainName": "$S3_WEBSITE_ENDPOINT",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-Website-$BUCKET_NAME",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      },
      "Headers": {
        "Quantity": 0
      }
    }
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100"
}
EOF

# Create the CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --output table
```

## Step 2: Get Distribution Information

```bash
# List all distributions to get your distribution ID
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,Comment,DomainName,Status]' \
  --output table

# Store your distribution ID
DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID_HERE"

# Get distribution details
aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.[Id,DomainName,Status]' \
  --output table
```

## Step 3: Custom Domain Setup (Optional)

### 3.1 Request SSL Certificate (if you don't have one)

```bash
# Replace with your domain name
DOMAIN_NAME="your-domain.com"

# Request ACM certificate (must be in us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name $DOMAIN_NAME \
  --subject-alternative-names "www.$DOMAIN_NAME" \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[*].[CertificateArn,DomainName]' \
  --output table
```

### 3.2 Update Distribution with Custom Domain

```bash
# Store your certificate ARN and domain
CERTIFICATE_ARN="arn:aws:acm:us-east-1:account:certificate/certificate-id"
DOMAIN_NAME="your-domain.com"

# Get current distribution config
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID \
  --output json > current-config.json

# Extract ETag for updates
ETAG=$(jq -r '.ETag' current-config.json)

# Update config with custom domain and certificate
jq '.DistributionConfig.Aliases = {
  "Quantity": 2,
  "Items": ["'$DOMAIN_NAME'", "www.'$DOMAIN_NAME'"]
} | .DistributionConfig.ViewerCertificate = {
  "ACMCertificateArn": "'$CERTIFICATE_ARN'",
  "SSLSupportMethod": "sni-only",
  "MinimumProtocolVersion": "TLSv1.2_2021",
  "CertificateSource": "acm"
}' current-config.json > updated-config.json

# Apply the updated configuration
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file://updated-config.json \
  --if-match $ETAG
```

## Step 4: Configure Route 53 (Optional)

```bash
# Get your hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='$DOMAIN_NAME.'].Id" \
  --output text | cut -d'/' -f3)

# Get CloudFront domain name
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.DomainName' \
  --output text)

# Create Route 53 record
cat > route53-record.json << EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DOMAIN_NAME",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z2FDTNDATAQYW2"
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.$DOMAIN_NAME",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z2FDTNDATAQYW2"
        }
      }
    }
  ]
}
EOF

# Apply Route 53 changes
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://route53-record.json
```

## Step 5: Invalidate Cache (For Updates)

```bash
# Create invalidation for all files
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id $DISTRIBUTION_ID \
  --output table
```

## Step 6: Optimize Cache Behaviors

```bash
# Create optimized cache behaviors for better performance
cat > optimized-cache-config.json << EOF
{
  "Quantity": 3,
  "Items": [
    {
      "PathPattern": "/assets/*",
      "TargetOriginId": "S3-Website-$BUCKET_NAME",
      "ViewerProtocolPolicy": "redirect-to-https",
      "MinTTL": 31536000,
      "DefaultTTL": 31536000,
      "MaxTTL": 31536000,
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {"Forward": "none"}
      },
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      }
    },
    {
      "PathPattern": "*.js",
      "TargetOriginId": "S3-Website-$BUCKET_NAME",
      "ViewerProtocolPolicy": "redirect-to-https",
      "MinTTL": 86400,
      "DefaultTTL": 86400,
      "MaxTTL": 31536000,
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {"Forward": "none"}
      },
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      }
    },
    {
      "PathPattern": "*.css",
      "TargetOriginId": "S3-Website-$BUCKET_NAME",
      "ViewerProtocolPolicy": "redirect-to-https",
      "MinTTL": 86400,
      "DefaultTTL": 86400,
      "MaxTTL": 31536000,
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {"Forward": "none"}
      },
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      }
    }
  ]
}
EOF
```

## Security Headers (Optional)

Add security headers using CloudFront Functions:

```javascript
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    
    // Security headers
    headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
    headers['content-security-policy'] = { value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:;" };
    headers['x-frame-options'] = { value: 'DENY' };
    headers['x-content-type-options'] = { value: 'nosniff' };
    headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
    headers['permissions-policy'] = { value: 'camera=(), microphone=(), geolocation=()' };
    
    return response;
}
```

## Testing Your Setup

```bash
# Test HTTPS access
curl -I https://$CLOUDFRONT_DOMAIN

# Test custom domain (if configured)
curl -I https://$DOMAIN_NAME

# Test SPA routing
curl -I https://$DOMAIN_NAME/some-route

# Test health endpoint
curl https://$DOMAIN_NAME/health.json
```

## Monitoring and Troubleshooting

### Check Distribution Status
```bash
aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.Status' \
  --output text
```

### View CloudFront Logs
Enable logging in your distribution and check S3 logs bucket.

### Common Issues

1. **403/404 Errors**: Ensure custom error responses are configured to serve `index.html`
2. **SSL Certificate Issues**: Certificate must be in `us-east-1` region
3. **DNS Propagation**: Allow 24-48 hours for full DNS propagation
4. **Cache Issues**: Use invalidations for immediate updates

## Cleanup Commands

```bash
# Remove Route 53 records
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{"Changes":[{"Action":"DELETE","ResourceRecordSet":{"Name":"'$DOMAIN_NAME'","Type":"A","AliasTarget":{"DNSName":"'$CLOUDFRONT_DOMAIN'","EvaluateTargetHealth":false,"HostedZoneId":"Z2FDTNDATAQYW2"}}}]}'

# Disable and delete distribution
aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file://disabled-config.json \
  --if-match $ETAG

# After distribution is disabled, delete it
aws cloudfront delete-distribution \
  --id $DISTRIBUTION_ID \
  --if-match $NEW_ETAG

# Clean up temporary files
rm -f cloudfront-config.json current-config.json updated-config.json route53-record.json optimized-cache-config.json
``` 