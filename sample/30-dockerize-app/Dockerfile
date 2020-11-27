FROM node:latest

WORKDIR /30-dockerize-app

COPY ./package.json ./30-dockerize-app/package.json

RUN npm install

ADD . /30-dockerize-app

VOLUME ["/node_modules"]

VOLUME [ "/src" ]

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
