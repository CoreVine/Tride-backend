const ChildGroupDetailsModel = require('../../models/ChildGroupDetails');
const ChildRepository = require('../child');
const BaseRepository = require('../base.repository');
const { NotFoundError } = require('../../utils/errors/types/Api.error');

class ChildGroupDetailsRepository extends BaseRepository {
    constructor() {
        super(ChildGroupDetailsModel);
    }

    async addChildrenToParentGroup(parentId, parentGroupId, children) {
        if (!children || !children.length)
            return [];

        const t = await this.model.sequelize.transaction();

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
                await ChildRepository.findById(child.child_id, {
                    where: {
                        parent_id: parentId
                    }
                });

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
                    await existingChild.save({ transaction: t });
                    parentChildrenGroup.push(existingChild);
                    continue;
                }
        
                childDetailsPayload.child_id = child.child_id;
                childDetailsPayload.timing_from = child.timing_from;
                childDetailsPayload.timing_to = child.timing_to;
    
                const newChildOnGroup = await this.create(childDetailsPayload, { transaction: t });
                parentChildrenGroup.push(newChildOnGroup);
            }

            await t.commit();

            return parentChildrenGroup;
        } catch(error) {
            await t.rollback();

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
