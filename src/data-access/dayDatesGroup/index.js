const DayDatesGroupModel = require('../../models/DayDatesGroup');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class GroupDaysRepository extends BaseRepository {
    constructor() {
        super(DayDatesGroupModel);
    }

    async countDaysInGroup(rideGroupId) {
        try {
            return await this.model.count({
                where: {
                    ride_group_detailsid: rideGroupId
                }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async createBulkDaysGroup(rideGroupId, days, options = {}) {
        try {
            const daysAdded = [];

            for (let i = 0; i < days.length; i++) {
                const day = days[i];
                
                const dayAdded = await this.create({
                    ride_group_detailsid: rideGroupId,
                    date_day: day
                }, options);

                daysAdded.push(dayAdded);
            }

            return daysAdded;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new GroupDaysRepository();
