const UserModel = require('../../models/User');
const BaseRepository = require('../base.repository');
const { DatabaseError, Op } = require("sequelize");

class UserRepository extends BaseRepository {
    constructor() {
        super(UserModel);
    }

    async findOneByEmailOrUsername({ email, username }){
        try {
            return await this.model.findOne({
                where: {
                    [Op.or]: [
                        { email },
                        { username }
                    ]
                }
            })
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findOneByEmail(email){
        try {
            return await this.model.findOne({
                where: { email }
            })
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async findByIdExcludeProps(id, excludeProps = []){
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
    
    // New methods for pagination and common queries
    async findAllPaginatedUsers(page = 1, limit = 10) {
        try {
            return await this.findAllPaginated(page, limit, {
                attributes: { exclude: ['password_hash'] },
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    /**
     * Delete a user and all associated data with proper deletion order
     * to avoid foreign key constraint errors
     * @param {number} userId - The ID of the user to delete
     * @returns {Promise<boolean>} True if successful
     */
    async deleteUserWithRelations(userId) {
        let transaction;
        try {
            // Start a transaction
            transaction = await this.model.sequelize.transaction();
            const sequelize = this.model.sequelize;
            
            // Find all carts for this user
            const carts = await sequelize.models.Cart.findAll({
                where: { user_id: userId },
                transaction
            });
            
            // Get all cart IDs
            const cartIds = carts.map(cart => cart.order_id);
            
            if (cartIds.length > 0) {
                // 1. First find and delete OrderStatusHistory records via Orders
                const orders = await sequelize.models.Order.findAll({
                    where: { cart_order_id: { [Op.in]: cartIds } },
                    transaction
                });
                
                const orderIds = orders.map(order => order.id);
                
                if (orderIds.length > 0) {
                    await sequelize.models.OrderStatusHistory.destroy({
                        where: { order_id: { [Op.in]: orderIds } },
                        transaction
                    });
                }
                
                // 2. Delete Orders
                await sequelize.models.Order.destroy({
                    where: { cart_order_id: { [Op.in]: cartIds } },
                    transaction
                });
                
                // 3. For CarWashOrders, delete dependent records first
                const carWashOrders = await sequelize.models.CarWashOrder.findAll({
                    where: { order_id: { [Op.in]: cartIds } },
                    transaction
                });
                
                const carWashOrderIds = carWashOrders.map(order => order.wash_order_id);
                
                if (carWashOrderIds.length > 0) {
                    // 3a. Delete WashOrderOperations
                    await sequelize.models.WashOrderOperation.destroy({
                        where: { wash_order_id: { [Op.in]: carWashOrderIds } },
                        transaction
                    });
                    
                    // 3b. Delete washorders_washtypes junction entries
                    await sequelize.query(
                        'DELETE FROM washorders_washtypes WHERE carwashorders_order_id IN (:carWashOrderIds)',
                        {
                            replacements: { carWashOrderIds },
                            type: sequelize.QueryTypes.DELETE,
                            transaction
                        }
                    );
                    
                    // 3c. Delete CarWashOrders
                    await sequelize.models.CarWashOrder.destroy({
                        where: { wash_order_id: { [Op.in]: carWashOrderIds } },
                        transaction
                    });
                }
                
                // 4. Delete OrderItems
                await sequelize.models.OrderItem.destroy({
                    where: { order_id: { [Op.in]: cartIds } },
                    transaction
                });
                
                // 5. Delete RentalOrders
                await sequelize.models.RentalOrder.destroy({
                    where: { order_id: { [Op.in]: cartIds } },
                    transaction
                });
                
                // 6. Delete CarOrders
                await sequelize.models.CarOrders.destroy({
                    where: { orders_order_id: { [Op.in]: cartIds } },
                    transaction
                });
                
                // 7. Delete Carts
                await sequelize.models.Cart.destroy({
                    where: { order_id: { [Op.in]: cartIds } },
                    transaction
                });
            }
            
            // 8. Delete Ratings
            await sequelize.models.Rating.destroy({
                where: { user_id: userId },
                transaction
            });
            
            // 9. Delete CustomerCars
            await sequelize.models.CustomerCar.destroy({
                where: { customer_id: userId },
                transaction
            });
            
            // 10. Delete Employee records
            await sequelize.models.Employee.destroy({
                where: { user_id: userId },
                transaction
            });
            
            // 11. Finally delete the User
            await this.model.destroy({
                where: { user_id: userId },
                transaction
            });
            
            // Commit the transaction
            await transaction.commit();
            
            return true;
        } catch (error) {
            // Rollback the transaction on error
            if (transaction) await transaction.rollback();
            console.error('Error deleting user with relations:', error);
            throw new DatabaseError(error);
        }
    }
}

module.exports = new UserRepository();
