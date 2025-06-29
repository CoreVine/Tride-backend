const AccountModel = require('../../models/Account');
const BaseRepository = require('../base.repository');
const { DatabaseError, Op } = require("sequelize");

class AccountRepository extends BaseRepository {
    constructor() {
        super(AccountModel);
    }

    async findOneByEmail(email) {
        try {
            return await this.model.findOne({
                where: { email }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByIdExcludeProps(id, excludeProps = []) {
        try {
            return await this.model.findByPk(id, {
                attributes: {
                    exclude: excludeProps
                }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findAllPaginatedAccounts(page = 1, limit = 10) {
        try {
            return await this.findAllPaginated(page, limit, {
                attributes: { exclude: ['password'] },
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByIdIncludeParentAndDriver(id) {
        try {
            return await this.model.findByPk(id, {
                include: [
                    {
                        model: this.model.sequelize.models.Parent,
                        as: 'parent',
                        required: false
                    },
                    {
                        model: this.model.sequelize.models.Driver,
                        as: 'driver',
                        required: false
                    }
                ]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    /**
     * Delete an account and all associated data
     * @param {number} accountId - The ID of the account to delete
     * @returns {Promise<boolean>} True if successful
     */
    async deleteAccountWithRelations(accountId) {
        let transaction;
        try {
            // Start a transaction
            transaction = await this.model.sequelize.transaction();
            const sequelize = this.model.sequelize;
            
            // Delete Parent record if exists
            await sequelize.models.Parent.destroy({
                where: { account_id: accountId },
                transaction
            });
            
            // Delete Driver record if exists
            await sequelize.models.Driver.destroy({
                where: { account_id: accountId },
                transaction
            });
            
            // Delete Account
            await this.model.destroy({
                where: { id: accountId },
                transaction
            });
            
            // Commit the transaction
            await transaction.commit();
            
            return true;
        } catch (error) {
            // Rollback the transaction on error
            if (transaction) await transaction.rollback();
            console.error('Error deleting account with relations:', error);
            throw new DatabaseError(error);
        }
    }
}

module.exports = new AccountRepository();
