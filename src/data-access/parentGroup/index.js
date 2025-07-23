const ParentGroupModel = require('../../models/ParentGroup');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class ParentGroupRepository extends BaseRepository {
    constructor() {
        super(ParentGroupModel);
    }

    async findByGroupAndParentId(groupId, parentId) {
        try {
            return await this.model.findOne({
                where: {
                    group_id: groupId,
                    parent_id: parentId
                }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async updateParentGroupStatus(parentGroupId, status) {
        try {
          const parentGroup = await this.model.findByPk(parentGroupId);
          if (!parentGroup) {
            throw new DatabaseError("Parent group not found");
          }
    
          parentGroup.status = status;
          await parentGroup.save();
    
          return parentGroup;
        } catch (error) {
          throw new DatabaseError(error);
        }
      }

    async getSeatsTaken(groupId, parentId) {
        try {
            const parentGroup = await this.findByGroupAndParentId(groupId, parentId);
            if (!parentGroup) {
                return 0; // No seats taken if no parent group found
            }
            
            return parentGroup.current_seats_taken || 0;
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new ParentGroupRepository();
