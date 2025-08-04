const ParentModel = require('../../models/Parent');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class ParentRepository extends BaseRepository {
    constructor() {
        super(ParentModel);
    }

    async findByAccountId(accountId) {
        try {
            return await this.model.findOne({
                where: { account_id: accountId }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
   
    async findByAccountIdWithGovernorate(accountId) {
        try {
            return await this.model.findOne({
                where: { account_id: accountId },
                include: [{
                    association: 'city',
                    attributes: ['id'],
                    include: [{
                        association: 'governorate'
                    }]
                }]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByIdWithChildren(parentId) {
        try {
            return await this.model.findByPk(parentId, {
                include: [
                    {
                        association: 'children',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByAccountIdWithChildren(accountId) {
        try {
            return await this.model.findOne({
                where: { account_id: accountId },
                include: [
                    {
                        association: 'children',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async updateDocumentsApprovalStatus(parentId, approved, approvalDate = null) {
        try {
            const updateData = {
                documents_approved: approved
            };
            
            updateData.documents_approval_date = approvalDate;
            
            return await this.model.update(updateData, {
                where: { id: parentId }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

  
      
}

module.exports = new ParentRepository();
