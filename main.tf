terraform {
  backend "s3" {
    bucket         = "n16-terraform-state-bucket"
    key            = "n16-pits-terraform.tfstate"
    region         = "us-east-1"
    # dynamodb_table = "terraform-lock-table" # Optional, for state locking
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

# Data source for shared HTTPS listener
data "aws_lb_listener" "shared_https_listener" {
  load_balancer_arn = data.aws_lb.nsixteen_shared_lb.arn
  port              = 443
}

# Creating an ECR Repository
resource "aws_ecr_repository" "n16-pubs-in-the-sun" {
    name                 = "n16-pubs-in-the-sun"
    image_tag_mutability = "MUTABLE"
    force_delete         = true
 
    image_scanning_configuration {
        scan_on_push = true
    }
}

# --- Build & push inintial image ---
locals {
  repo_url = aws_ecr_repository.n16-pubs-in-the-sun.repository_url
}

resource "null_resource" "image" {
  triggers = {
    hash = md5(join("-", [for x in fileset("", "./{*.py,*.tsx,Dockerfile}") : filemd5(x)]))
  }

  provisioner "local-exec" {
    command = <<EOT
      # Retrieve the ECR authentication token
      aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${local.repo_url}
      
      # Build and push the Docker image
      docker build --platform linux/amd64 -t ${local.repo_url}:latest .
      docker push ${local.repo_url}:latest
    EOT

    interpreter = ["bash", "-c"]
  }
}

data "aws_ecr_image" "latest" {
  repository_name = aws_ecr_repository.n16-pubs-in-the-sun.name
  image_tag       = "latest"
  depends_on      = [null_resource.image]
}

# Creating an ECS cluster
resource "aws_ecs_cluster" "n16-pubs-in-the-sun-cluster" {
  name = "n16-pubs-in-the-sun-cluster" # Naming the cluster
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
  name               = "n16-pubs-in-the-sun-ecsTaskExecutionRole"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

# attaching AmazonECSTaskExecutionRolePolicy to ecsTaskExecutionRole
resource "aws_iam_role_policy_attachment" "ecsTaskExecutionRole_policy" {
  role       = aws_iam_role.ecsTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Creating the task definition
resource "aws_ecs_task_definition" "n16-pubs-in-the-sun-task" {
  family                   = "n16-pubs-in-the-sun-task"
  container_definitions    = jsonencode([
    {
      name : "n16-pubs-in-the-sun-container",
      image : "${aws_ecr_repository.n16-pubs-in-the-sun.repository_url}:latest",
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
  resource_id        = "service/${aws_ecs_cluster.n16-pubs-in-the-sun-cluster.name}/${aws_ecs_service.n16-pubs-in-the-sun-service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Application Auto Scaling Policy
resource "aws_appautoscaling_policy" "ecs_policy" {
  name               = "n16-pubs-in-the-sun-autoscaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 50.0
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

# Creating a target group for the load balancer
resource "aws_lb_target_group" "n16-pubs-in-the-sun-target-group" {
  name        = "n16-pubs-in-the-sun-tg"
  port        = 80
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_default_vpc.default_vpc.id

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
    Name = "n16-pubs-in-the-sun-target-group"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Listener Rule
resource "aws_lb_listener_rule" "n16_pubs_in_the_sun" {
  listener_arn = data.aws_lb_listener.shared_https_listener.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n16-pubs-in-the-sun-target-group.arn
  }

  condition {
    host_header {
      values = ["www.pubsinthesun.co.uk"]
    }
  }
}

# Creating the service
resource "aws_ecs_service" "n16-pubs-in-the-sun-service" {
  name            = "n16-pubs-in-the-sun-service"
  cluster         = aws_ecs_cluster.n16-pubs-in-the-sun-cluster.id
  task_definition = aws_ecs_task_definition.n16-pubs-in-the-sun-task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  load_balancer {
    target_group_arn = aws_lb_target_group.n16-pubs-in-the-sun-target-group.arn
    container_name   = "n16-pubs-in-the-sun-container"
    container_port   = 3000
  }

  network_configuration {
    subnets          = [aws_default_subnet.default_subnet_a.id, aws_default_subnet.default_subnet_b.id, aws_default_subnet.default_subnet_c.id]
    assign_public_ip = true
    security_groups  = [aws_security_group.n16-pubs-in-the-sun-service_security_group.id]
  }
}

# Creating a security group for the load balancer:
resource "aws_security_group" "n16-pubs-in-the-sun-lb_security_group" {
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

# Creating a security group for the service
resource "aws_security_group" "n16-pubs-in-the-sun-service_security_group" {
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

# Route 53 A Record
resource "aws_route53_record" "www_pubsinthesun_co_uk" {
  zone_id = "Z05108222H2EZWWRTK9Y2"  # Pubs in the Sun Hosted Zone
  name    = "www.pubsinthesun.co.uk"
  type    = "A"

  alias {
    name                   = data.aws_lb.nsixteen_shared_lb.dns_name
    zone_id                = data.aws_lb.nsixteen_shared_lb.zone_id
    evaluate_target_health = true
  }
}

output "website_url" {
  value       = "https://www.pubsinthesun.co.uk"
  description = "URL for Pubs in the Sun website"
}