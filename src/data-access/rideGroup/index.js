const RideGroupModel = require('../../models/RideGroup');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class RideGroupRepository extends BaseRepository {
    constructor() {
        super(RideGroupModel);
    }

    async getRideGroupDetails(rideGroupId) {
        try {
            return await this.model.findByPk(rideGroupId, {
                include: [
                    {
                        association: 'creator',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    },
                    {
                        association: 'driver',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    },
                    {
                        association: 'school'
                    },
                    {
                        association: 'plan'
                    },
                    {
                        association: 'parentGroups',
                        include: [
                            {
                                association: 'parent',
                                attributes: { exclude: ['created_at', 'updated_at'] }
                            },
                            {
                                association: 'childDetails',
                                include: [
                                    {
                                        association: 'child'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        association: 'dayDates'
                    }
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByIdIfParent(parentId, rideGroupId, options = {}) {
        try {
            const queryOptions = {
                where: {
                    id: rideGroupId,
                    '$parentGroups.parent_id$': parentId
                },
                include: [{
                    association: 'parentGroups',
                    required: true
                }],
                ...options
            };
            
            return await this.model.findOne(queryOptions);
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new RideGroupRepository();
