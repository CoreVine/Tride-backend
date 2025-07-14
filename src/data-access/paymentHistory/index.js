const PaymentHistory = require('../../models/PaymentHistory');
const BaseRepository = require('../base.repository');

class PaymentHistoryRepository extends BaseRepository {
    constructor() {
        super(PaymentHistory);
    }

    async findByIdDetailed(id) {
        return await this.model.findOne({
            where: { id },
            include: [
                {
                    model: this.model.sequelize.models.ParentGroupSubscription,
                    as: 'parent_group_subscription',
                    include: [
                        {
                            model: this.model.sequelize.models.Parent,
                            as: 'parent',
                            attributes: ['id', 'name'],
                            include: [
                                {
                                    model: this.model.sequelize.models.Account,
                                    as: 'account',
                                    attributes: ['id', 'email']
                                }
                            ]
                        },
                        {
                            model: this.model.sequelize.models.RideGroup,
                            as: 'rideGroup',
                            attributes: ['id', 'group_name']
                        },
                        {
                            model: this.model.sequelize.models.Plan,
                            as: 'plan',
                            attributes: ['id', 'range']
                        }
                    ]
                }
            ]
        });
    }
}

module.exports = new PaymentHistoryRepository();
