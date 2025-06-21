const RideGroupModel = require('../../models/RideGroup');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class RideGroupRepository extends BaseRepository {
    constructor() {
        super(RideGroupModel);
    }
}

module.exports = new RideGroupRepository();
