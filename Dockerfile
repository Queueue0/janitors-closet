FROM node:16

WORKDIR /janitors-closet

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]