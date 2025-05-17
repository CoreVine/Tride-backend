const DriverPapersModel = require('../../models/DriverPapers');
const BaseRepository = require('../base.repository');
const { DatabaseError } = require("sequelize");

class DriverPapersRepository extends BaseRepository {
    constructor() {
        super(DriverPapersModel);
    }

    async findByDriverId(driverId) {
        try {
            return await this.model.findOne({
                where: { driver_id: driverId }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async updateApprovalStatus(papersId, approved, approvalDate = null) {
        try {
            const updateData = {
                approved: approved
            };
            
            if (approvalDate) {
                updateData.approval_date = approvalDate;
            }
            
            return await this.model.update(updateData, {
                where: { id: papersId }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }

    async updateWithoutFaceAuth(papersId, updateData) {
        try {
            // Ensure face_auth_complete is not included in updateData
            if (updateData.face_auth_complete !== undefined) {
                delete updateData.face_auth_complete;
            }
            
            return await this.model.update(updateData, {
                where: { id: papersId }
            });
        } catch (error) {
            throw new DatabaseError(error);
        }
    }
}

module.exports = new DriverPapersRepository();
