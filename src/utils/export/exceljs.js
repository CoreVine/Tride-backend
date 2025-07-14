const ExcelJS = require('exceljs');

/**
 * Exports data to Excel with static headers for payment data
 * @param {Array} data - The data to export
 * @param {Object} options - Options for controlling the export
 * @returns {Object} - Object containing the Excel buffer
 */
const exportPaymentsToExcel = async (data, options = {}) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payment History');
    
    // Static headers for grouped payment data
    const headers = [
        { header: 'Parent Email', key: 'parent_email', width: 25 },
        { header: 'Parent Name', key: 'parent_name', width: 20 },
        { header: 'Parent Phone', key: 'parent_phone', width: 15 },
        { header: 'School Name', key: 'school_name', width: 20 },
        { header: 'Group Name', key: 'group_name', width: 20 },
        { header: 'Group Type', key: 'group_type', width: 15 },
        { header: 'Plan Range', key: 'plan_range', width: 15 },
        { header: 'Seats Taken', key: 'seats_taken', width: 12 },
        { header: 'Pickup Days', key: 'pickup_days', width: 12 },
        { header: 'Total Amount', key: 'total_amount', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Started At', key: 'started_at', width: 18 },
        { header: 'Valid Until', key: 'valid_until', width: 18 },
        { header: 'Last Payment', key: 'last_payment_amount', width: 15 },
        { header: 'Last Payment Date', key: 'last_payment_date', width: 18 },
        { header: 'Months Paid', key: 'months_paid', width: 12 }
    ];

    worksheet.columns = headers;
    worksheet.getRow(1).font = { bold: true };

    // Group data by parent email to reduce redundancy
    if (data && data.length > 0) {
        const groupedData = {};
        
        // Group subscriptions by parent email
        data.forEach(item => {
            const parentEmail = item.parent?.account?.email || 'Unknown';
            if (!groupedData[parentEmail]) {
                groupedData[parentEmail] = [];
            }
            groupedData[parentEmail].push(item);
        });

        // Add rows with parent info only on first occurrence
        Object.keys(groupedData).forEach(parentEmail => {
            const subscriptions = groupedData[parentEmail];
            
            subscriptions.forEach((item, index) => {
                const isFirstSubscription = index === 0;
                
                worksheet.addRow({
                    parent_email: isFirstSubscription ? item.parent?.account?.email || '' : '',
                    parent_name: isFirstSubscription ? item.parent?.name || '' : '',
                    parent_phone: isFirstSubscription ? item.parent?.phone || '' : '',
                    school_name: item.rideGroup?.school?.school_name || '',
                    group_name: item.rideGroup?.group_name || '',
                    group_type: item.rideGroup?.group_type || '',
                    plan_range: item.plan?.range || '',
                    seats_taken: item.current_seats_taken,
                    pickup_days: item.pickup_days_count,
                    total_amount: item.total_amount,
                    status: item.status,
                    started_at: item.started_at || '',
                    valid_until: item.valid_until || '',
                    last_payment_amount: item.payment_history?.[0]?.amount || '',
                    last_payment_date: item.payment_history?.[0]?.paid_at || '',
                    months_paid: item.payment_history?.length || 0,
                });
            });
            
            // Add empty row between different parents for better readability
            if (Object.keys(groupedData).indexOf(parentEmail) < Object.keys(groupedData).length - 1) {
                worksheet.addRow({});
            }
        });
    }

    // Apply conditional formatting for status column
    const statusColIndex = headers.findIndex(col => col.key === 'status') + 1;
    
    if (statusColIndex > 0) {
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header

            const statusCell = row.getCell(statusColIndex);
            const status = String(statusCell.value || '').toLowerCase();

            let fillColor;
            if (status === 'paid') fillColor = 'C6EFCE';
            else if (status === 'pending') fillColor = 'FFEB9C';
            else if (status === 'new') fillColor = 'F8CBAD';

            if (fillColor) {
                statusCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: fillColor }
                };
            }
        });
    }

    // Return the workbook as a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

module.exports = {
    exportPaymentsToExcel
};
