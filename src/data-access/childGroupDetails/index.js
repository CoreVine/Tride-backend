const ChildGroupDetailsModel = require('../../models/ChildGroupDetails');
const ChildRepository = require('../child');
const BaseRepository = require('../base.repository');
const { NotFoundError } = require('../../utils/errors/types/Api.error');

class ChildGroupDetailsRepository extends BaseRepository {
    constructor() {
        super(ChildGroupDetailsModel);
    }


    async addChildrenToParentGroup(parentId, parentGroupId, children, options = {}, { parentGroup, rideGroup } = {}) {
        if (!children || !children.length)
            return [];

        let inner = false;
        let newChildrenCounter = 0;

        if (!options.transaction) {
            options.transaction = await this.model.sequelize.transaction();
            inner = true;
        }

        try {
            let childDetailsPayload = {
                parent_group_id: parentGroupId,
                child_id: 0,
                timing_from: '',
                timing_to: ''
            }

            const parentChildrenGroup = [];
        
            for(let i = 0; i < children.length; i++) {
                const child = children[i];

                // check for the child existence
                const childExists = await ChildRepository.findOne({
                    where: {
                        id: child.child_id,
                        parent_id: parentId
                    }
                });

                if (!childExists) {
                    throw new NotFoundError(`Unable to create a new ride group.`);
                }

                // Check for existing children before starting transaction
                const existingChild = await this.model.findOne({
                    where: {
                        parent_group_id: parentGroupId,
                        child_id: child.child_id
                    }
                });
                
                if (existingChild) {
                    existingChild.timing_from = child.timing_from;
                    existingChild.timing_to = child.timing_to;
                    await existingChild.save(options);
                    parentChildrenGroup.push(existingChild);
                    continue;
                }
                
                newChildrenCounter++;
                childDetailsPayload.child_id = child.child_id;
                childDetailsPayload.timing_from = child.timing_from;
                childDetailsPayload.timing_to = child.timing_to;
    
                const newChildOnGroup = await this.create(childDetailsPayload, options);
                parentChildrenGroup.push(newChildOnGroup);
            }

            if (rideGroup && newChildrenCounter) {
                // Update the ride group with the current seats taken
                await rideGroup.update(
                    { current_seats_taken: this.model.sequelize.literal('current_seats_taken + ' + newChildrenCounter) },
                    options
                );
            }

            if (parentGroup) {
                // Update the parent group with the current seats taken
                await parentGroup.update(
                    { current_seats_taken: this.model.sequelize.literal('current_seats_taken + ' + newChildrenCounter) },
                    options
                );
            }

            if (inner) {
                await options.transaction.commit();
            }

            return parentChildrenGroup;
        } catch(error) {
            if (inner) {
                await options.transaction.rollback();
            }
            if (error.name === 'SequelizeForeignKeyConstraintError')
                throw new NotFoundError("Invalid child");
            
            throw error;
        }
    }

    async findByParentGroupId(parentGroupId) {
        try {
            return await this.model.findAll({
                where: { parent_group_id: parentGroupId },
                include: [
                    {
                        association: 'child',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new ChildGroupDetailsRepository();
