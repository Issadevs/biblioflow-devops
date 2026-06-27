FROM nginx:1.31-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend /usr/share/nginx/html

EXPOSE 80
