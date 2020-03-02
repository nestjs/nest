pipeline {
    agent { label 'mignon_1' }
    tools { nodejs 'NodeJS' }
    stages {
        stage('Test') {
            steps {
                echo 'Testing'
                sh 'npm ci'
                sh 'npm run build'
                sh 'npm run test'
            }
        }
        stage('Build') {
            steps {
                echo "Building"
                sh 'npm ci'
                sh 'npm run build'
            }
        }
    }
    post {
        always {
            chuckNorris()
        }
    }
}
