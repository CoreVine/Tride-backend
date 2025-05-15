CREATE SCHEMA IF NOT EXISTS tride;


CREATE TABLE tride.child (
  id bigint NOT NULL PRIMARY KEY,
  name varchar(500),
  profile_pic varchar(500),
  grade varchar(500),
  gender varchar(500),
  parent_id bigint
);


CREATE TABLE tride.governorate (
  id int NOT NULL PRIMARY KEY,
  governorate_name varchar(500)
);


CREATE TABLE tride.account (
  id bigint NOT NULL PRIMARY KEY,
  email varchar(500),
  password varchar(500),
  is_verified boolean,
  auth_method varchar(500)
);


CREATE TABLE tride.parent (
  id bigint NOT NULL PRIMARY KEY,
  account_id bigint,
  name varchar(500),
  profile_pic varchar(500),
  phone varchar(500),
  google_place_id varchar(500),
  lat decimal,
  lng decimal,
  formatted_address varchar(500),
  city_id bigint,
  gender varchar(500),
  front_side_nic varchar(500),
  back_side_nic varchar(500),
  face_auth_complete boolean,
  created_at datetime,
  updated_at datetime
);


CREATE TABLE group_plan (
  id bigint NOT NULL PRIMARY KEY,
  group_plan_price bigint,
  group_days_per_month tinyint,
  issued_at datetime
);


CREATE TABLE tride.child_group_details (
  id bigint NOT NULL PRIMARY KEY,
  parent_group_id bigint,
  child_id bigint,
  timing_from time,
  timing_to time
);


CREATE TABLE group_subscription (
  id bigint NOT NULL PRIMARY KEY,
  parent_id bigint,
  seat_numbers tinyint,
  ride_group_id bigint,
  payed_at datetime,
  payment_details_id bigint
);


CREATE TABLE ride_child_delivered (
  id bigint NOT NULL PRIMARY KEY,
  ride_history_id bigint,
  child_id bigint,
  delivered_at  bigint
);


CREATE TABLE ride_history (
  id bigint NOT NULL PRIMARY KEY,
  lat bigint,
  lng bigint,
  issued_at datetime,
  status tinytext,
  ride_instance_id bigint
);


CREATE TABLE ride_instance (
  id bigint NOT NULL PRIMARY KEY,
  driver_id int,
  started_at datetime,
  group_id bigint
);


CREATE TABLE tride.driver (
  id int NOT NULL PRIMARY KEY,
  account_id bigint,
  name varchar(500),
  profile_pic varchar(500),
  phone varchar(500),
  license_number varchar(500),
  lat decimal,
  lng decimal,
  formatted_address varchar(500),
  city_id bigint,
  gender varchar(500),
  created_at datetime,
  updated_at datetime
);


CREATE TABLE driver_papers (
  id bigint NOT NULL PRIMARY KEY,
  driver_id int,
  front_side_national_url text,
  back_side_national_url text,
  car_model bigint,
  car_model_year smallint,
  driver_license_url text,
  driver_license_exp_date date,
  car_license_url text,
  car_license_exp_date date,
  approved boolean,
  approval_date date
);


CREATE TABLE tride.ride_group (
  id bigint NOT NULL PRIMARY KEY,
  parent_creator_id bigint,
  group_name varchar(500) NOT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  driver_id int,
  school_id bigint NOT NULL,
  current_seats_taken tinyint NOT NULL,
  group_plan_id bigint
);


CREATE TABLE payment_history (
  id bigint NOT NULL PRIMARY KEY,
  paymob_receipt_id varchar(500),
  payed_at datetime,
  payment_sub_type tinytext
);


CREATE TABLE tride.city (
  id bigint NOT NULL PRIMARY KEY,
  name varchar(500),
  governorate_id int
);


CREATE TABLE tride.schools (
  id bigint NOT NULL PRIMARY KEY,
  school_name varchar(500),
  city_id bigint,
  lat decimal,
  lng decimal
);


CREATE TABLE tride.day_dates_group (
  id bigint PRIMARY KEY,
  ride_group_detailsid bigint NOT NULL,
  date_day date
);


CREATE TABLE tride.verification_codes (
  id varchar(500) NOT NULL PRIMARY KEY,
  email varchar(500) NOT NULL,
  code varchar(500) NOT NULL,
  type varchar NOT NULL,
  verified boolean NOT NULL,
  reset_token varchar(500) UNIQUE,
  token_used boolean NOT NULL,
  attempt_count varchar(500) NOT NULL,
  expires_at datetime NOT NULL,
  account_type varchar NOT NULL,
  created_at datetime,
  updated_at datetime
);

CREATE INDEX tride_verification_code_email_type_idx ON tride.verification_codes (email, type);
CREATE INDEX tride_verification_code_reset_token_idx ON tride.verification_codes (reset_token);
CREATE INDEX tride_verification_code_expires_at_idx ON tride.verification_codes (expires_at);

CREATE TABLE driver_payment (
  id bigint NOT NULL PRIMARY KEY,
  salary float,
  driver_id int,
  issued_for date,
  issued_at datetime
);


CREATE TABLE tride.parent_group (
  id bigint NOT NULL PRIMARY KEY,
  group_id bigint,
  parent_id bigint,
  home_lat float,
  home_lng float
);


CREATE TABLE driver_payment_methods (
  id int NOT NULL PRIMARY KEY,
  driver_id int NOT NULL,
  payment_method bigint NOT NULL,
  payment_details_json text NOT NULL
);


ALTER TABLE tride.account ADD CONSTRAINT account_id_driver_account_id FOREIGN KEY (id) REFERENCES tride.driver (account_id);
ALTER TABLE tride.account ADD CONSTRAINT account_id_parent_account_id FOREIGN KEY (id) REFERENCES tride.parent (account_id);
ALTER TABLE tride.child_group_details ADD CONSTRAINT child_group_details_parent_group_id_fk FOREIGN KEY (parent_group_id) REFERENCES tride.parent_group (id);
ALTER TABLE tride.child ADD CONSTRAINT child_id_child_group_details_child_id FOREIGN KEY (id) REFERENCES tride.child_group_details (child_id);
ALTER TABLE tride.ride_group ADD CONSTRAINT children_group_driver_id_fk FOREIGN KEY (driver_id) REFERENCES tride.driver (id);
ALTER TABLE tride.ride_group ADD CONSTRAINT children_group_school_id_fk FOREIGN KEY (school_id) REFERENCES tride.schools (id);
ALTER TABLE tride.city ADD CONSTRAINT city_governorate_id_fk FOREIGN KEY (governorate_id) REFERENCES tride.governorate (id);
ALTER TABLE tride.city ADD CONSTRAINT city_id_driver_city_id FOREIGN KEY (id) REFERENCES tride.driver (city_id);
ALTER TABLE tride.city ADD CONSTRAINT city_id_parent_city_id FOREIGN KEY (id) REFERENCES tride.parent (city_id);
ALTER TABLE tride.city ADD CONSTRAINT city_id_schools_city_id FOREIGN KEY (id) REFERENCES tride.schools (city_id);
ALTER TABLE tride.day_dates_group ADD CONSTRAINT day_dates_group_ride_group_detailsid_fk FOREIGN KEY (ride_group_detailsid) REFERENCES tride.ride_group (id);
ALTER TABLE driver_papers ADD CONSTRAINT driver_papers_driver_id_fk FOREIGN KEY (driver_id) REFERENCES tride.driver (id);
ALTER TABLE driver_payment ADD CONSTRAINT driver_payment_driver_id_fk FOREIGN KEY (driver_id) REFERENCES tride.driver (id);
ALTER TABLE driver_payment_methods ADD CONSTRAINT driver_payment_methods_driver_id_fk FOREIGN KEY (driver_id) REFERENCES tride.driver (id);
ALTER TABLE group_subscription ADD CONSTRAINT group_subscription_payment_details_id_fk FOREIGN KEY (payment_details_id) REFERENCES payment_history (id);
ALTER TABLE group_subscription ADD CONSTRAINT group_subscription_ride_group_id_fk FOREIGN KEY (ride_group_id) REFERENCES tride.ride_group (id);
ALTER TABLE tride.parent_group ADD CONSTRAINT parent_group_group_id_fk FOREIGN KEY (group_id) REFERENCES tride.ride_group (id);
ALTER TABLE tride.parent_group ADD CONSTRAINT parent_group_parent_id_fk FOREIGN KEY (parent_id) REFERENCES tride.parent (id);
ALTER TABLE tride.parent ADD CONSTRAINT parent_id_child_parent_id FOREIGN KEY (id) REFERENCES tride.child (parent_id);
ALTER TABLE tride.parent ADD CONSTRAINT parent_id_children_group_parent_creator_id FOREIGN KEY (id) REFERENCES tride.ride_group (parent_creator_id);
ALTER TABLE ride_child_delivered ADD CONSTRAINT ride_child_delivered_child_id_fk FOREIGN KEY (child_id) REFERENCES tride.child (id);
ALTER TABLE tride.ride_group ADD CONSTRAINT ride_group_group_plan_id_fk FOREIGN KEY (group_plan_id) REFERENCES group_plan (id);
ALTER TABLE ride_instance ADD CONSTRAINT ride_history_driver_id_fk FOREIGN KEY (driver_id) REFERENCES tride.driver (id);
ALTER TABLE ride_instance ADD CONSTRAINT ride_history_group_id_fk FOREIGN KEY (group_id) REFERENCES tride.ride_group (id);
ALTER TABLE ride_history ADD CONSTRAINT ride_history_ride_instance_id_fk FOREIGN KEY (ride_instance_id) REFERENCES ride_instance (id);
ALTER TABLE ride_child_delivered ADD CONSTRAINT ride_payment_ride_history_id_fk FOREIGN KEY (ride_history_id) REFERENCES ride_history (id);
