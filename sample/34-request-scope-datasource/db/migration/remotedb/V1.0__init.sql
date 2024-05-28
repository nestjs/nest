-- Client 1 and client 2 have same db schema.
-- We only will add fake "product" table, a simple pretext
-- for I/O in client respective DB.

-- The product only has a name and an id.
create table product
(
    id   integer not null
        constraint product_pk
            primary key,
    name text    not null
);

-- Then, we add random product name so in clientdb1 and
-- clientdb2, we will have 3 product in each, with different names.
insert into product (id, name) values (0, concat('product_name_', md5(random()::text)));
insert into product (id, name) values (1, concat('product_name_', md5(random()::text)));
insert into product (id, name) values (2, concat('product_name_', md5(random()::text)));
