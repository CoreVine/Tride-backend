const DayDatesGroupModel = require('../../models/DayDatesGroup');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class GroupDaysRepository extends BaseRepository {
    constructor() {
        super(DayDatesGroupModel);
    }

    async createBulkDaysGroup(rideGroupId, days) {
        const t = await this.model.sequelize.transaction();

        try {
            const daysAdded = [];

            for (let i = 0; i < days.length; i++) {
                const day = days[i];
                
                const dayAdded = await this.create({
                    ride_group_detailsid: rideGroupId,
                    date_day: day
                }, { transaction: t });

                daysAdded.push(dayAdded);
            }

            await t.commit();
            return daysAdded;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
}

module.exports = new GroupDaysRepository();
