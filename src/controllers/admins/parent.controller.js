const { BadRequestError, NotFoundError } = require("../../utils/errors");

const { exportParentsToExcel } = require("../../utils/export/exceljs");

const ParentRepository = require("../../data-access/parent");
const RideGroupRepository = require("../../data-access/rideGroup");
const Sequelize = require('sequelize');

const adminParentController = {
	getAllParents: async (req, res, next) => {
		try {
			const { page = 1, limit = 10, name, school_id } = req.query;
			const schoolQuery = school_id ? {
				where: {
					school_id
				}
			} : {}
			const parents = await ParentRepository.findAllPaginated(page, limit, {
				where: {
					name: {
						[Sequelize.Op.like]: `%${name || ''}%`
					},
				},
				include: [
					{ association: 'account', attributes: ['id', 'email', 'account_type', 'auth_method', 'is_verified'] },
					{ association: 'children' },
					{ 
						association: 'groups',
						attributes: ['id'],
						include: [{
							association: 'group',
							attributes: ['school_id'],
							...schoolQuery,
							include: [{
								association: 'school',
								attributes: ['school_name']
							}]
						}]
					}
				]
			})
			return res.success('Parents retrieved successfully', parents)
		} catch (error) {
				console.error(`Error in adminParentController.getAllParents: ${error.message}`);
				next(error)
		}
	},

	getParentById: async (req, res, next) => {
		try {
			const { parentId } = req.params;
			if (!parentId) {
				throw new BadRequestError('Parent ID is required');
			}

			const parent = await ParentRepository.findById(parentId, {
				include: [
					{ association: 'account', attributes: ['id', 'email', 'account_type', 'auth_method', 'is_verified'] },
					{ association: 'children' },
				]
			});

			if (!parent) {
				throw new NotFoundError(`Parent with ID ${parentId} not found`);
			}

			return res.success('Parent retrieved successfully', parent);
		} catch (error) {
			console.error(`Error in adminParentController.getParentById: ${error.message}`);
			next(error);
		}
	},

	getParentRideGroups: async (req, res, next) => {
		try {
			const { parentId } = req.params;
			const { page = 1, limit = 10, name, seats, type } = req.query;

			const rideGroups = await RideGroupRepository.findAllDetailedPaginatedByParentId(+parentId, page, limit, {
				name,
				seats,
				type
			});

			return res.success('Ride groups retrieved successfully', rideGroups);
		} catch (error) {
			console.error(`Error in adminParentController.getParentRideGroups: ${error.message}`);
			next(error);
		}
	},

	updateParent: async (req, res, next) => {
		try {
			const { parentId } = req.params;
			const { documents_approved } = req.body;

			await ParentRepository.updateDocumentsApprovalStatus(parentId, documents_approved, documents_approved ? new Date() : null);

			return res.success('Parent updated successfully');
		} catch (error) {
			console.error(`Error in adminParentController.updateParent: ${error.message}`);
			next(error);
		}
	},

	exportParents: async(req, res, next) => {
		try {
			const data = await ParentRepository.findAll({
				include: [
					{ association: 'children', attributes: ['id'] },
					{ association: 'account', attributes: ['id', 'email', 'is_verified', 'auth_method'] },
					{ association: 'groups', attributes: ['id'] },
					{ association: 'city' }
				]
			});

			const exportBuffer = await exportParentsToExcel(data);
			const fileName = `parents_data.xlsx`;
			
			res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
			res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
			res.send(exportBuffer);
		} catch (error) {
				return next(error);
		}
	}
};

module.exports = adminParentController;
