const AccountModel = require('../../models/Account');
const BaseRepository = require('../base.repository');
const { DatabaseError, Op } = require("sequelize");

/**
 * Repository for account-related database operations
 */
class AccountRepository extends BaseRepository {
    constructor() {
        super(AccountModel);
    }

    /**
     * Find account by email
     * @param {string} email - Account email
     * @returns {Promise<Account>} Account object
     */
    async findOneByEmail(email) {
        try {
            return await this.model.findOne({
                where: { email }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    /**
     * Find account by ID excluding specified properties
     * @param {number} id - Account ID
     * @param {string[]} excludeProps - Properties to exclude
     * @returns {Promise<Account>} Account object
     */
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

    /**
     * Get paginated accounts with password excluded
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} Paginated accounts
     */
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

    /**
     * Find account by ID including related profile details
     * @param {number} id - Account ID
     * @param {string} requiredType - Required account type (parent, driver, admin)
     * @returns {Promise<Account>} Account with related profiles
     */
    async findByIdIncludeDetails(id, requiredType) {
        try {
            const includeOptions = [
                {
                    model: this.model.sequelize.models.Parent,
                    as: 'parent',
                    required: false
                },
                {
                    model: this.model.sequelize.models.Driver,
                    as: 'driver',
                    required: false,
                    include: [
                        {
                            model: this.model.sequelize.models.DriverPapers,
                            as: 'papers',
                            attributes: ['approved']
                        }
                    ]
                },
                {
                    model: this.model.sequelize.models.Admin,
                    as: 'admin',
                    required: false,
                    include: [{
                        model: this.model.sequelize.models.AdminRoles,
                        as: 'role',
                        include: [{
                            model: this.model.sequelize.models.AdminPermission,
                            as: 'permissions',
                            attributes: ['id', 'role_permission_group', 'role_permission_name']
                        }],
                        attributes: ['id', 'role_name']
                    }]
                }
            ];

            const result = await this.model.findByPk(id, { include: includeOptions });

            return result ? result.toJSON() : null;
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
            transaction = await this.model.sequelize.transaction();
            const sequelize = this.model.sequelize;
            
            // Delete associated records
            await Promise.all([
                sequelize.models.Parent.destroy({
                    where: { account_id: accountId },
                    transaction
                }),
                sequelize.models.Driver.destroy({
                    where: { account_id: accountId },
                    transaction
                }),
                sequelize.models.Admin.destroy({
                    where: { account_id: accountId },
                    transaction
                })
            ]);
            
            // Delete the account itself
            await this.model.destroy({
                where: { id: accountId },
                transaction
            });
            
            await transaction.commit();
            return true;
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('Error deleting account with relations:', error);
            throw new DatabaseError(error);
        }
    }

    async getChatParticipantsProfilePictures(accountsDetails) {
        try {
            return await this.model.findAll({
                where: {
                    [Op.or]: accountsDetails
                },
                attributes: ['id'],
                include: [
                    {
                        model: this.model.sequelize.models.Parent,
                        as: 'parent',
                        attributes: ['profile_pic']
                    },
                    {
                        model: this.model.sequelize.models.Driver,
                        as: 'driver',
                        attributes: ['profile_pic']
                    }
                ]
            });
        } catch (error) {
            console.error('Error fetching chat participants profile pictures:', error);
            throw new DatabaseError(error);
        }
    }
}

module.exports = new AccountRepository();
