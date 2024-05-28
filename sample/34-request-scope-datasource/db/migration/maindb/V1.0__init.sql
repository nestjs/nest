-- Table initialization. We only need a client id and
-- its corresponding conf
create table client_db_conf
(
    id        serial
        constraint table_name_pk
            primary key,
    client_id text not null,
    db_conf   jsonb   not null
);

-- Then, we add client 1 db connection conf
insert into client_db_conf (id, client_id, db_conf)
values (0, 'client1', '{
  "host": "localhost",
  "database": "client1db",
  "username": "adminpostgres",
  "password": "adminpostgres",
  "port": 34302
}');

-- Then, we add client 2 db connection conf
insert into client_db_conf (id, client_id, db_conf)
values (1, 'client2', '{
  "host": "localhost",
  "database": "client2db",
  "username": "adminpostgres",
  "password": "adminpostgres",
  "port": 34303
}');
