CREATE SCHEMA IF NOT EXISTS tride;
USE tride;


CREATE TABLE child (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  profile_pic VARCHAR(2048),  -- URL for profile picture
  grade VARCHAR(50) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  parent_id BIGINT UNSIGNED
);


CREATE TABLE governorate (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  governorate_name VARCHAR(255)
);


CREATE TABLE account (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  account_type VARCHAR(15) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  auth_method VARCHAR(50) NOT NULL
);


CREATE TABLE parent (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  profile_pic VARCHAR(2048),  -- URL for profile picture
  phone VARCHAR(20) NOT NULL,
  google_place_id VARCHAR(255),
  lat DECIMAL(10,6),
  lng DECIMAL(10,6),
  formatted_address VARCHAR(500),
  city_id INT UNSIGNED NOT NULL,
  gender VARCHAR(20) NOT NULL,
  front_side_nic VARCHAR(2048),  -- URL for document
  back_side_nic VARCHAR(2048),   -- URL for document
  face_auth_complete TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE group_plan (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_plan_price DECIMAL(10,2),
  group_days_per_month TINYINT UNSIGNED,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE child_group_details (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_group_id BIGINT UNSIGNED NOT NULL,
  child_id BIGINT UNSIGNED NOT NULL,
  timing_from TIME NOT NULL,
  timing_to TIME NOT NULL
);


CREATE TABLE group_subscription (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT UNSIGNED NOT NULL,
  seat_numbers TINYINT UNSIGNED NOT NULL,
  ride_group_id BIGINT UNSIGNED NOT NULL,
  payed_at DATETIME NOT NULL,
  payment_details_id BIGINT UNSIGNED NOT NULL
);


CREATE TABLE ride_child_delivered (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ride_history_id BIGINT UNSIGNED NOT NULL,
  child_id BIGINT UNSIGNED NOT NULL,
  delivered_at DATETIME NOT NULL
);


CREATE TABLE ride_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lat DECIMAL(10,6) NOT NULL,
  lng DECIMAL(10,6) NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  ride_instance_id BIGINT UNSIGNED NOT NULL
);


CREATE TABLE ride_instance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  driver_id INT UNSIGNED,
  started_at DATETIME NOT NULL,
  group_id BIGINT UNSIGNED NOT NULL
);


CREATE TABLE driver (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  profile_pic VARCHAR(2048),  -- URL for profile picture
  phone VARCHAR(20) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  lat DECIMAL(10,6),
  lng DECIMAL(10,6),
  formatted_address VARCHAR(500),
  city_id INT UNSIGNED NOT NULL,
  gender VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE driver_papers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  driver_id INT UNSIGNED NOT NULL,
  front_side_national_url VARCHAR(2048) NOT NULL,  -- URL for document
  back_side_national_url VARCHAR(2048) NOT NULL,   -- URL for document
  car_model VARCHAR(100) NOT NULL,
  car_model_year SMALLINT UNSIGNED NOT NULL,
  driver_license_url VARCHAR(2048) NOT NULL,       -- URL for document
  driver_license_exp_date DATE NOT NULL,
  car_license_url VARCHAR(2048) NOT NULL,         -- URL for document
  car_license_exp_date DATE NOT NULL,
  face_auth_complete TINYINT(1) NOT NULL DEFAULT 0,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  approval_date DATE
);


CREATE TABLE ride_group (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_creator_id BIGINT UNSIGNED,
  group_name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  driver_id INT UNSIGNED,
  school_id INT UNSIGNED NOT NULL,
  current_seats_taken TINYINT UNSIGNED NOT NULL DEFAULT 0,
  group_plan_id INT UNSIGNED
);


CREATE TABLE payment_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  paymob_receipt_id VARCHAR(255) NOT NULL,
  payed_at DATETIME NOT NULL,
  payment_sub_type VARCHAR(50) NOT NULL
);


CREATE TABLE city (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  governorate_id INT UNSIGNED NOT NULL
);


CREATE TABLE schools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL,
  city_id INT UNSIGNED NOT NULL,
  lat DECIMAL(10,6) NOT NULL,
  lng DECIMAL(10,6) NOT NULL
);


CREATE TABLE day_dates_group (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ride_group_detailsid BIGINT UNSIGNED NOT NULL,
  date_day DATE
);


CREATE TABLE verification_codes (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  reset_token VARCHAR(255) UNIQUE,
  token_used TINYINT(1) NOT NULL DEFAULT 0,
  attempt_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX tride_verification_code_email_type_idx ON verification_codes (email, type);
CREATE INDEX tride_verification_code_reset_token_idx ON verification_codes (reset_token);
CREATE INDEX tride_verification_code_expires_at_idx ON verification_codes (expires_at);

CREATE TABLE driver_payment (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  salary DECIMAL(10,2) NOT NULL,
  driver_id INT UNSIGNED NOT NULL,
  issued_for DATE NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE parent_group (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NOT NULL,
  home_lat DECIMAL(10,6) NOT NULL,
  home_lng DECIMAL(10,6) NOT NULL
);


CREATE TABLE driver_payment_methods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  driver_id INT UNSIGNED NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_details_json JSON NOT NULL
);


ALTER TABLE driver ADD INDEX (account_id);
ALTER TABLE parent ADD INDEX (account_id);

ALTER TABLE driver ADD CONSTRAINT driver_account_id_fk FOREIGN KEY (account_id) REFERENCES account(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE parent ADD CONSTRAINT parent_account_id_fk FOREIGN KEY (account_id) REFERENCES account(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE child_group_details ADD CONSTRAINT child_group_details_parent_group_id_fk FOREIGN KEY (parent_group_id) REFERENCES parent_group (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE child_group_details ADD CONSTRAINT child_group_details_child_id_fk FOREIGN KEY (child_id) REFERENCES child (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE child ADD CONSTRAINT child_parent_id_fk FOREIGN KEY (parent_id) REFERENCES parent (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ride_group ADD CONSTRAINT children_group_driver_id_fk FOREIGN KEY (driver_id) REFERENCES driver (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ride_group ADD CONSTRAINT children_group_school_id_fk FOREIGN KEY (school_id) REFERENCES schools (id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE city ADD CONSTRAINT city_governorate_id_fk FOREIGN KEY (governorate_id) REFERENCES governorate (id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE driver ADD CONSTRAINT driver_city_id_fk FOREIGN KEY (city_id) REFERENCES city (id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE parent ADD CONSTRAINT parent_city_id_fk FOREIGN KEY (city_id) REFERENCES city (id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE schools ADD CONSTRAINT schools_city_id_fk FOREIGN KEY (city_id) REFERENCES city (id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE day_dates_group ADD CONSTRAINT day_dates_group_ride_group_detailsid_fk FOREIGN KEY (ride_group_detailsid) REFERENCES ride_group (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE driver_papers ADD CONSTRAINT driver_papers_driver_id_fk FOREIGN KEY (driver_id) REFERENCES driver (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE driver_payment ADD CONSTRAINT driver_payment_driver_id_fk FOREIGN KEY (driver_id) REFERENCES driver (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE driver_payment_methods ADD CONSTRAINT driver_payment_methods_driver_id_fk FOREIGN KEY (driver_id) REFERENCES driver (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE group_subscription ADD CONSTRAINT group_subscription_payment_details_id_fk FOREIGN KEY (payment_details_id) REFERENCES payment_history (id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE group_subscription ADD CONSTRAINT group_subscription_ride_group_id_fk FOREIGN KEY (ride_group_id) REFERENCES ride_group (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE group_subscription ADD CONSTRAINT group_subscription_parent_id_fk FOREIGN KEY (parent_id) REFERENCES parent (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE parent_group ADD CONSTRAINT parent_group_group_id_fk FOREIGN KEY (group_id) REFERENCES ride_group (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE parent_group ADD CONSTRAINT parent_group_parent_id_fk FOREIGN KEY (parent_id) REFERENCES parent (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ride_group ADD CONSTRAINT ride_group_parent_creator_id_fk FOREIGN KEY (parent_creator_id) REFERENCES parent (id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ride_child_delivered ADD CONSTRAINT ride_child_delivered_child_id_fk FOREIGN KEY (child_id) REFERENCES child (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ride_group ADD CONSTRAINT ride_group_group_plan_id_fk FOREIGN KEY (group_plan_id) REFERENCES group_plan (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ride_instance ADD CONSTRAINT ride_instance_driver_id_fk FOREIGN KEY (driver_id) REFERENCES driver (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ride_instance ADD CONSTRAINT ride_instance_group_id_fk FOREIGN KEY (group_id) REFERENCES ride_group (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ride_history ADD CONSTRAINT ride_history_ride_instance_id_fk FOREIGN KEY (ride_instance_id) REFERENCES ride_instance (id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ride_child_delivered ADD CONSTRAINT ride_child_delivered_ride_history_id_fk FOREIGN KEY (ride_history_id) REFERENCES ride_history (id) ON UPDATE CASCADE ON DELETE CASCADE;

