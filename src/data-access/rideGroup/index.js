const RideGroupModel = require('../../models/RideGroup');
const BaseRepository = require('../base.repository');
const { DatabaseError, Op } = require("sequelize");
const { generateInviteCode } = require('../../utils/generators/uuid-gen');

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

    async findAllIfParent(parentId, options = {}) {
        try {
            const queryOptions = {
                where: {
                    '$parentGroups.parent_id$': parentId
                },
                include: [{
                    association: 'parentGroups',
                    required: true
                },
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
                }],
                ...options
            };
            
            return await this.model.findAll(queryOptions);
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

    /**
     * Generates a unique invite code for a ride group
     * @param {number} length - Length of the invite code
     * @returns {Promise<string>} A unique invite code
     */
    async generateUniqueInviteCode(length = 8) {
        try {
            let isUnique = false;
            let inviteCode = '';
            
            // Keep generating codes until we find a unique one
            while (!isUnique) {
                inviteCode = generateInviteCode(length);
                
                // Check if this code already exists
                const existingGroup = await this.model.findOne({
                    where: { invite_code: inviteCode }
                });
                
                if (!existingGroup) {
                    isUnique = true;
                }
            }
            
            return inviteCode;
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByInviteCode(inviteCode) {
        try {
            return await this.model.findOne({
                where: {
                    invite_code: inviteCode
                }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new RideGroupRepository();
