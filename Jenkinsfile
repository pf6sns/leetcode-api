pipeline {
    agent any

    tools {
        nodejs 'NodeJS_18'
    }



    environment {
        AWS_REGION = 'ap-south-1'
        ECR_REPO = '864981730114.dkr.ecr.ap-south-1.amazonaws.com/leetcode-api'
        ECS_CLUSTER = 'snsihub-cluster-dev'
        ECS_SERVICE = 'leetcode-api-dev'
        TASK_FAMILY = 'leetcode-api-dev'  // Task Definition Name
        CONTAINER_NAME = 'leetcode-api-dev'   // Name of the container inside ECS task definition
        PORT = '3000'  // Application port
    }

    stages {
        stage('Checkout Code') {
            steps {
                script {
                    echo '📦 Checking out source code...'
                    checkout scm
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    echo '🧪 Running unit tests...'
                    sh """
                    npm install
                    npm run test
                    """
                }
            }
        }

        stage('AWS ECR Login') {
            steps {
                script {
                    echo '🔐 Logging into AWS ECR...'
                    sh 'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO'
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                script {
                    echo '🐳 Building and pushing Docker image to ECR...'
                    sh """
                    docker build -t ${ECR_REPO}:${BUILD_NUMBER} .
                    docker tag ${ECR_REPO}:${BUILD_NUMBER} ${ECR_REPO}:latest
                    docker push ${ECR_REPO}:${BUILD_NUMBER}
                    docker push ${ECR_REPO}:latest
                    """
                }
            }
        }

        stage('Register New Task Definition with Latest Image') {
            steps {
                script {
                    echo '📝 Registering new ECS task definition...'
                    // Fetch the existing task definition
                    sh "aws ecs describe-task-definition --task-definition $TASK_FAMILY --query 'taskDefinition' > task-def.json"

                    // Modify the task definition to update the container image
                    sh """
                    jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) |
                        .containerDefinitions[0].image = "${ECR_REPO}:latest" |
                        .containerDefinitions[0].environment = [
                            {"name": "PORT", "value": "${PORT}"},
                            {"name": "NODE_ENV", "value": "production"}
                        ]' task-def.json > new-task-def.json
                    """

                    // Register the updated task definition
                    sh "aws ecs register-task-definition --cli-input-json file://new-task-def.json"
                }
            }
        }

        stage('Update ECS Service with New Task Definition') {
            steps {
                script {
                    echo '🚀 Deploying to ECS...'
                    def TASK_REVISION = sh(script: "aws ecs describe-task-definition --task-definition $TASK_FAMILY --query 'taskDefinition.revision' --output text", returnStdout: true).trim()
                    echo "New Task Definition Revision: ${TASK_REVISION}"

                    sh """
                    aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --task-definition ${TASK_FAMILY}:${TASK_REVISION} --force-new-deployment
                    """
                }
            }
        }

        stage('Wait for Service Stability') {
            steps {
                script {
                    echo '⏳ Waiting for ECS service to stabilize...'
                    sh """
                    aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}
                    """
                    echo '✅ Service is stable!'
                }
            }
        }
    }

    post {
        success {
            echo '✅ LeetCode API Deployment Successful! 🎉'
            echo '🌐 API is now available at your ECS service endpoint'

            // 🔥 Remove unused Docker images **immediately**
            sh 'docker image prune -a -f'

            // 🔥 Remove stopped containers
            sh 'docker container prune -f'
        }
        failure {
            echo '❌ LeetCode API Deployment Failed!'
            echo '📧 Please check the logs and notify the development team'

            // 🔥 Cleanup failed build images
            sh 'docker image prune -a -f'
        }
        always {
            // 🔄 Ensure unused volumes and networks are cleaned up
            sh 'docker system prune -f --volumes'
            
            // Clean up temporary files
            sh 'rm -f task-def.json new-task-def.json'
        }
    }
}
