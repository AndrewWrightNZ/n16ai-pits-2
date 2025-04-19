terraform {
  backend "s3" {
    bucket         = "n16-terraform-state-bucket"
    key            = "n16-pits-azul-staging-terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-1" # region of the user account
  access_key = var.AWS_ACCESS_KEY_ID
  secret_key = var.AWS_SECRET_ACCESS_KEY
}

# Shared Application Load Balancer (reference)
data "aws_lb" "nsixteen_shared_lb" {
  name = "nsixteen-shared-lb"
}

# Data source for shared security group
data "aws_security_group" "shared_lb_security_group" {
  name = "n16_shared_security_group"
}

data "aws_lb_listener" "shared_https_listener" {
  load_balancer_arn = data.aws_lb.nsixteen_shared_lb.arn
  port              = 443
}

# Creating an ECR Repository
resource "aws_ecr_repository" "n16-pits-azul-staging" {
    name                 = "n16-pits-azul-staging"
    image_tag_mutability = "MUTABLE"
    force_delete         = true
 
    image_scanning_configuration {
        scan_on_push = true
    }
}

# --- Build & push inintial image ---
locals {
  repo_url = aws_ecr_repository.n16-pits-azul-staging.repository_url
}

variable "image_tag" {
  description = "Specific Docker image tag to deploy"
  default     = "latest"
}

variable "AWS_ACCESS_KEY_ID" {
  description = "AWS Access Key ID"
  sensitive   = true
}

variable "AWS_SECRET_ACCESS_KEY" {
  description = "AWS Secret Access Key"
  sensitive   = true
}

variable "VITE_SUPABASE_URL" {
  description = "Supabase URL"
  sensitive   = true
}

variable "VITE_SUPABASE_ANON_KEY" {
  description = "Supabase Anonymous Key"
  sensitive   = true
}

resource "null_resource" "image" {
  # Only run this when not in CI/CD (when var.image_tag is "latest")
  count = var.image_tag == "latest" ? 1 : 0
  
  triggers = {
    hash = md5(join("-", [for x in fileset("${path.module}/..", "{*.py,*.tsx,Dockerfile}") : filemd5("${path.module}/../${x}")]))
  }

  provisioner "local-exec" {
    command = <<EOT
      # Print current directory and list files for debugging
      pwd
      ls -la
      
      # Change to the root directory
      cd "${path.module}/.."
      
      # Print root directory and list files for debugging
      pwd
      ls -la
      
      # Retrieve the ECR authentication token
      aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${local.repo_url}
      
      # Build and push the Docker image
      docker build --platform linux/amd64 -t ${local.repo_url}:${var.image_tag} .
      docker push ${local.repo_url}:${var.image_tag}
      
      # Change back to the staging directory
      cd "${path.module}"
    EOT

    interpreter = ["bash", "-c"]
  }
}

# Creating an ECS cluster
resource "aws_ecs_cluster" "n16-pits-azul-staging-cluster" {
  name = "n16-pits-azul-staging-cluster" 
}

# creating an iam policy document for ecsTaskExecutionRole
data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# creating an iam role with needed permissions to execute tasks
resource "aws_iam_role" "ecsTaskExecutionRole" {
  name               = "n16-pits-azul-staging-ecsTaskExecutionRole"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

# attaching AmazonECSTaskExecutionRolePolicy to ecsTaskExecutionRole
resource "aws_iam_role_policy_attachment" "ecsTaskExecutionRole_policy" {
  role       = aws_iam_role.ecsTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Creating the task definition
resource "aws_ecs_task_definition" "n16-pits-azul-staging-task" {
  family                   = "n16-pits-azul-staging-task"
  container_definitions    = jsonencode([
    {
      name : "n16-pits-azul-staging-container",
      image : "${aws_ecr_repository.n16-pits-azul-staging.repository_url}:${var.image_tag}",
      essential : true,
      portMappings : [
        {
          containerPort : 3000,
          hostPort : 3000
        }
      ],
      memory : 512,
      cpu : 256,
      environment : [
        { name : "VITE_SUPABASE_URL", value : var.VITE_SUPABASE_URL },
        { name : "VITE_SUPABASE_ANON_KEY", value : var.VITE_SUPABASE_ANON_KEY },
      ]
    }
  ])
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  memory                   = 512
  cpu                      = 256
  execution_role_arn       = aws_iam_role.ecsTaskExecutionRole.arn
}

# Application Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 5
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.n16-pits-azul-staging-cluster.name}/${aws_ecs_service.n16-pits-azul-staging-service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Application Auto Scaling Policy
resource "aws_appautoscaling_policy" "ecs_policy" {
  name               = "n16-pits-azul-staging-autoscaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 80.0
  }
}

# Providing a reference to our default VPC
resource "aws_default_vpc" "default_vpc" {
}

# Providing a reference to our default subnets
resource "aws_default_subnet" "default_subnet_a" {
  availability_zone = "us-east-1a"
}

resource "aws_default_subnet" "default_subnet_b" {
  availability_zone = "us-east-1b"
}

resource "aws_default_subnet" "default_subnet_c" {
  availability_zone = "us-east-1c"
}

# Reference to the existing certificate
data "aws_acm_certificate" "pubsinthesun" {
  domain = "*.pubsinthesun.com"
  statuses = ["ISSUED"]
  most_recent = true
}

# Add certificate to the existing listener via SNI
resource "aws_lb_listener_certificate" "azul_preview" {
  listener_arn    = data.aws_lb_listener.shared_https_listener.arn
  certificate_arn = data.aws_acm_certificate.pubsinthesun.arn
}

# Creating a security group for the load balancer:
resource "aws_security_group" "n16-pits-azul-staging-lb_security_group" {
  ingress {
    from_port   = 80 
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] 
  }

  ingress {
    from_port   = 443 
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] 
  }

  egress {
    from_port   = 0             
    to_port     = 0             
    protocol    = "-1"          
    cidr_blocks = ["0.0.0.0/0"] 
  }
}

# Creating a target group for the load balancer
resource "aws_lb_target_group" "n16-pits-azul-staging-tg" {
  name        = "n16-pits-azul-staging-tg"
  port        = 80
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_default_vpc.default_vpc.id # Referencing the default VPC

  health_check {
    matcher = "200,301,302"
    path    = "/"
  }

  deregistration_delay = 300

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = false
  }

  tags = {
    Name = "n16-pits-azul-staging-tg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Listener Rule
resource "aws_lb_listener_rule" "n16_pits_staging" {
  listener_arn = data.aws_lb_listener.shared_https_listener.arn
  priority     = 950

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n16-pits-azul-staging-tg.arn
  }

  condition {
    host_header {
      values = ["azul-preview.pubsinthesun.com"]
    }
  }
}

# Creating the service
resource "aws_ecs_service" "n16-pits-azul-staging-service" {
  name            = "n16-pits-azul-staging-service"
  cluster         = aws_ecs_cluster.n16-pits-azul-staging-cluster.id
  task_definition = aws_ecs_task_definition.n16-pits-azul-staging-task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  load_balancer {
    target_group_arn = aws_lb_target_group.n16-pits-azul-staging-tg.arn
    container_name   = "n16-pits-azul-staging-container"
    container_port   = 3000
  }

  network_configuration {
    subnets          = [aws_default_subnet.default_subnet_a.id, aws_default_subnet.default_subnet_b.id, aws_default_subnet.default_subnet_c.id]
    assign_public_ip = true
    security_groups  = [aws_security_group.n16-pits-azul-staging-service_security_group.id]
  }
}

# Creating a security group for the service
resource "aws_security_group" "n16-pits-azul-staging-service_security_group" {
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [data.aws_security_group.shared_lb_security_group.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# CloudFront Origin Request Policy for maintaining host headers
resource "aws_cloudfront_origin_request_policy" "maintain_host_header" {
  name    = "n16-azul-preview-maintain-host-header"
  comment = "Policy to maintain host headers for Azul Preview"
  
  cookies_config {
    cookie_behavior = "all"
  }
  
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Host", "Origin", "Referer"] # Removed "Authorization" as it's not allowed
    }
  }
  
  query_strings_config {
    query_string_behavior = "all"
  }
}

# CloudFront Cache Policy for static assets (still valid and unchanged)
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "n16-azul-preview-static-assets"
  comment     = "Cache policy for static assets"
  default_ttl = 86400     # 1 day
  max_ttl     = 31536000  # 1 year
  min_ttl     = 3600      # 1 hour
  
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
      }
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# CloudFront distribution for the React app
resource "aws_cloudfront_distribution" "azul_preview_cdn" {
  origin {
    domain_name = data.aws_lb.nsixteen_shared_lb.dns_name
    origin_id   = "ALBOrigin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    
    custom_header {
      name  = "X-Forwarded-Host"
      value = "azul-preview.pubsinthesun.com"
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "/"
  aliases             = ["azul-preview.pubsinthesun.com"]
  price_class         = "PriceClass_100" # Use only North America and Europe edge locations (cheaper)
  
  # Default cache behavior for HTML and API routes - Using AWS managed policy
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"
    
    # Use AWS managed CachingDisabled policy instead of custom one
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # AWS managed policy ID for CachingDisabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.maintain_host_header.id
    
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }
  
  # Cache configuration for static assets (JS, CSS, images)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
    
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }
  
  # Cache configuration for static images
  ordered_cache_behavior {
    path_pattern     = "*.png"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
    
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }
  
  ordered_cache_behavior {
    path_pattern     = "*.jpg"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
    
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }
  
  ordered_cache_behavior {
    path_pattern     = "*.svg"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
    
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }
  
  ordered_cache_behavior {
    path_pattern     = "*.ico"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
    
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }
  
  # Additional font file caching
  ordered_cache_behavior {
    path_pattern     = "*.woff2"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALBOrigin"

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
    
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.pubsinthesun.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Add custom error response to handle SPA routing
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  tags = {
    Name        = "azul-preview-cdn"
    Environment = "staging"
  }
}

# Update Route 53 record to point to CloudFront instead of the load balancer
resource "aws_route53_record" "preview_pubsinthesun_com" {
  zone_id = "Z06588857HKEU14YCHXU" 
  name    = "azul-preview.pubsinthesun.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.azul_preview_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.azul_preview_cdn.hosted_zone_id
    evaluate_target_health = false
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Output the CloudFront distribution domain and ID
output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.azul_preview_cdn.domain_name
  description = "CloudFront distribution domain"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.azul_preview_cdn.id
  description = "ID of the CloudFront distribution for cache invalidation"
}

output "preview_url" {
  value       = "https://azul-preview.pubsinthesun.com"
  description = "URL for the preview environment (now served via CloudFront)"
}