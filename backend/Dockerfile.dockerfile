# Usa uma imagem oficial do Node.js
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência primeiro
COPY package*.json ./

# Instala as dependências do projeto
RUN npm install

# Copia o restante dos arquivos do backend
COPY . .

# Expõe a porta 8080 (Railway usa essa porta)
EXPOSE 8080

# Comando para iniciar o servidor
CMD ["npm", "start"]
