# 🚀 Frontend Deployment Guide

Complete guide for deploying RocketryBox Frontend to AWS S3 with CloudFront CDN.

## 📋 Overview

This project is configured for automatic deployment to AWS S3 using GitHub Actions. Every push to the `main` branch triggers a build and deployment process.

### Tech Stack
- **Frontend**: Vite + React + TypeScript
- **Hosting**: AWS S3 Static Website
- **CDN**: CloudFront (optional)
- **CI/CD**: GitHub Actions

## 🔧 Quick Setup

### 1. GitHub Secrets Configuration

Configure these secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

**Required Secrets:**
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-s3-bucket-name
VITE_BACKEND_URL=https://your-backend-api-url.com
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
TINYMCE_API_KEY=your_tinymce_api_key
VITE_SHOPIFY_CLIENT_ID=your_shopify_client_id
```

**Optional Secrets (for CloudFront):**
```
CLOUDFRONT_DISTRIBUTION_ID=your_distribution_id
```

### 2. S3 Bucket Setup

1. Create S3 bucket with static website hosting enabled
2. Apply the bucket policy from `aws-s3-bucket-policy.json`
3. Update bucket name in the policy file

### 3. Automatic Deployment

Once configured, deployments happen automatically:
- ✅ Push to `main` branch
- ✅ GitHub Actions builds the app
- ✅ Deploys to S3
- ✅ Invalidates CloudFront cache (if configured)

## 📁 Project Structure

```
RocketryBox_Frontend/
├── .github/workflows/
│   └── deploy-frontend.yml    # CI/CD workflow
├── src/                       # Source code
├── dist/                      # Build output (generated)
├── aws-s3-bucket-policy.json  # S3 bucket policy
├── .aws-s3-deploy.md          # Manual deployment guide
├── cloudfront-setup.md        # CloudFront setup guide
└── DEPLOYMENT.md              # This file
```

## 🔄 Build Process

The build process:

1. **Install Dependencies**: `npm ci`
2. **Set Environment Variables**: From GitHub secrets
3. **Build Application**: `npm run build` → creates `dist/` folder
4. **Add Health Check**: Creates `dist/health.json`
5. **Deploy to S3**: Syncs `dist/` to S3 bucket
6. **Invalidate CloudFront**: Clears CDN cache

## 🌐 Environment Configuration

### Development
```bash
# Local development
npm run dev
```

### Production Build
```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### Environment Variables

Create a `.env` file for local development:

```env
VITE_BACKEND_URL=http://localhost:8080
GOOGLE_MAPS_API_KEY=your_dev_api_key
TINYMCE_API_KEY=your_dev_api_key
VITE_SHOPIFY_CLIENT_ID=your_dev_client_id
```

## 🔐 AWS IAM Permissions

Your AWS user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🚀 Deployment Options

### Option 1: Automatic (Recommended)
- Push to `main` branch
- GitHub Actions handles everything
- Zero manual intervention required

### Option 2: Manual
- Follow `.aws-s3-deploy.md` guide
- Build and deploy manually using AWS CLI
- Useful for testing or one-off deployments

## 🌍 CloudFront CDN (Optional)

For HTTPS and global CDN:

1. Follow `cloudfront-setup.md` guide
2. Add `CLOUDFRONT_DISTRIBUTION_ID` to GitHub secrets
3. Custom domain and SSL certificate setup included

Benefits:
- ✅ HTTPS enabled
- ✅ Global CDN for faster loading
- ✅ Custom domain support
- ✅ Automatic cache invalidation

## 🏥 Health Checks

The deployment includes a health check endpoint:

```
GET /health.json
{
  "status": "healthy",
  "service": "rocketrybox-frontend",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🐛 Troubleshooting

### Build Fails in GitHub Actions
1. Check GitHub secrets are configured correctly
2. Verify Node.js version compatibility (requires 18+)
3. Check for dependency issues in `package.json`

### S3 Deployment Fails
1. Verify AWS credentials in GitHub secrets
2. Check S3 bucket permissions and policy
3. Ensure bucket name is correct in secrets

### 404 Errors on Route Refresh
1. Verify S3 error document is set to `index.html`
2. Check CloudFront custom error responses
3. Ensure React Router is handling routes correctly

### API Calls Fail
1. Check `VITE_BACKEND_URL` is correctly set
2. Verify CORS configuration on backend
3. Ensure backend is accessible from deployed domain

## 📊 Monitoring

### GitHub Actions
- View deployment status in Actions tab
- Check build logs for errors
- Monitor deployment history

### AWS CloudWatch
- S3 bucket metrics
- CloudFront request metrics
- Error rate monitoring

### Performance
- Use Lighthouse for performance audits
- Monitor Core Web Vitals
- Check CDN cache hit rates

## 🔄 Rollback Strategy

### Quick Rollback
1. Revert the problematic commit in `main` branch
2. GitHub Actions will deploy the previous version
3. CloudFront cache will be invalidated automatically

### Manual Rollback
1. Build previous version locally
2. Deploy manually using `.aws-s3-deploy.md` guide
3. Invalidate CloudFront cache manually

## 📞 Support

- **Build Issues**: Check GitHub Actions logs
- **AWS Issues**: Review AWS CloudTrail logs
- **Performance**: Use browser dev tools and Lighthouse

## 🔗 Related Files

- **CI/CD**: `.github/workflows/deploy-frontend.yml`
- **S3 Policy**: `aws-s3-bucket-policy.json`
- **Manual Deploy**: `.aws-s3-deploy.md`
- **CloudFront**: `cloudfront-setup.md`
- **Build Config**: `vite.config.ts` 