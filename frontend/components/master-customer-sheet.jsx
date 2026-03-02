'use client';

import { useCallback, useEffect, useState } from 'react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

const CUSTOMER_COLUMNS = [
	{ key: '__select__', label: '' },
	{ key: 'companyName', label: 'Company Name' },
	{ key: 'businessType', label: 'Business Type' },
	{ key: 'gstNumber', label: 'GST Number' },
	{ key: 'panNumber', label: 'PAN Number' },
	{ key: 'addressLine1', label: 'Address Line 1' },
	{ key: 'addressLine2', label: 'Address Line 2' },
	{ key: 'city', label: 'City' },
	{ key: 'state', label: 'State' },
	{ key: 'pinCode', label: 'PIN Code' },
	{ key: 'authorizedPersonName', label: 'Authorized Person' },
	{ key: 'designation', label: 'Designation' },
	{ key: 'mobile', label: 'Mobile' },
	{ key: 'email', label: 'Email' },
	{ key: 'accountName', label: 'Account Name' },
	{ key: 'bankName', label: 'Bank Name' },
	{ key: 'accountNumber', label: 'Account Number' },
	{ key: 'ifsc', label: 'IFSC Code' },
	{ key: 'status', label: 'Status' },
];

const columnConfig = {
	companyName: { minWidth: 'min-w-[140px]', headerBg: 'bg-indigo-200' },
	businessType: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
	gstNumber: { minWidth: 'min-w-[130px]', headerBg: 'bg-indigo-200' },
	panNumber: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
	addressLine1: { minWidth: 'min-w-[150px]', headerBg: 'bg-indigo-200' },
	addressLine2: { minWidth: 'min-w-[150px]', headerBg: 'bg-indigo-200' },
	city: { minWidth: 'min-w-[110px]', headerBg: 'bg-indigo-200' },
	state: { minWidth: 'min-w-[110px]', headerBg: 'bg-indigo-200' },
	pinCode: { minWidth: 'min-w-[100px]', headerBg: 'bg-indigo-200' },
	authorizedPersonName: { minWidth: 'min-w-[150px]', headerBg: 'bg-indigo-200' },
	designation: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
	mobile: { minWidth: 'min-w-[120px]', headerBg: 'bg-indigo-200' },
	email: { minWidth: 'min-w-[170px]', headerBg: 'bg-indigo-200' },
	accountName: { minWidth: 'min-w-[140px]', headerBg: 'bg-indigo-200' },
	bankName: { minWidth: 'min-w-[130px]', headerBg: 'bg-indigo-200' },
	accountNumber: { minWidth: 'min-w-[140px]', headerBg: 'bg-indigo-200' },
	ifsc: { minWidth: 'min-w-[110px]', headerBg: 'bg-indigo-200' },
	status: { minWidth: 'min-w-[110px]', headerBg: 'bg-indigo-200' },
};

function normalizeCustomerRows(payload = {}) {
	if (Array.isArray(payload.customerData)) return payload.customerData;
	if (Array.isArray(payload.kycData)) return payload.kycData;
	if (Array.isArray(payload.products)) return payload.products;
	return [];
}

export default function MasterCustomerSheet() {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [customers, setCustomers] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
	const [selectedRows, setSelectedRows] = useState(new Set());
	const [sortField, setSortField] = useState('');
	const [sortDirection, setSortDirection] = useState('asc');
	const [visibleColumns, setVisibleColumns] = useState(
		new Set(CUSTOMER_COLUMNS.map((column) => column.key))
	);
	const [selectedColumnsForAction, setSelectedColumnsForAction] = useState(new Set());
	const [emptyRowsData, setEmptyRowsData] = useState(
		Array.from({ length: 10 }).map(() => ({}))
	);

	const loadCustomerData = useCallback(async () => {
		setIsLoading(true);
		setError('');

		try {
			const response = await fetch('/api/save-to-sheets', {
				method: 'GET',
			});

			if (response.ok) {
				const data = await response.json();
				setCustomers(normalizeCustomerRows(data));
			} else {
				setError('Failed to load customer data');
			}
		} catch (err) {
			console.error('Error loading customer data:', err);
			setError('Failed to load customer data');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCustomerData();
	}, [loadCustomerData]);

	const filteredCustomers = customers.filter((customer) => {
		const search = searchTerm.toLowerCase();
		return (
			customer.companyName?.toLowerCase().includes(search) ||
			customer.gstNumber?.toLowerCase().includes(search) ||
			customer.mobile?.toLowerCase().includes(search) ||
			customer.email?.toLowerCase().includes(search)
		);
	});

	const sortedCustomers = [...filteredCustomers].sort((a, b) => {
		if (!sortField) return 0;
		const aValue = a[sortField] || '';
		const bValue = b[sortField] || '';
		const comparison = String(aValue).localeCompare(String(bValue));
		return sortDirection === 'asc' ? comparison : -comparison;
	});

	const handleSelectAll = (checked) => {
		if (checked) {
			const totalRows = sortedCustomers.length > 0 ? sortedCustomers.length : emptyRowsData.length;
			setSelectedRows(new Set(Array.from({ length: totalRows }, (_, index) => index)));
		} else {
			setSelectedRows(new Set());
		}
	};

	const handleSelectRow = (index, checked) => {
		const newSelected = new Set(selectedRows);
		if (checked) {
			newSelected.add(index);
		} else {
			newSelected.delete(index);
		}
		setSelectedRows(newSelected);
	};

	const handleSort = (field) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	const toggleColumnSelection = (columnId) => {
		const newSelected = new Set(selectedColumnsForAction);
		if (newSelected.has(columnId)) {
			newSelected.delete(columnId);
		} else {
			newSelected.add(columnId);
		}
		setSelectedColumnsForAction(newSelected);
	};

	const handleSelectAllColumns = (checked) => {
		if (checked) {
			const allColumnIds = CUSTOMER_COLUMNS.filter((col) => col.key !== '__select__').map(
				(col) => col.key
			);
			setSelectedColumnsForAction(new Set(allColumnIds));
		} else {
			setSelectedColumnsForAction(new Set());
		}
	};

	const handleHideColumns = () => {
		const newVisible = new Set(visibleColumns);
		selectedColumnsForAction.forEach((column) => newVisible.delete(column));
		setVisibleColumns(newVisible);
		setSelectedColumnsForAction(new Set());
		setIsManageColumnsOpen(false);
	};

	const handleShowColumns = () => {
		const newVisible = new Set(visibleColumns);
		selectedColumnsForAction.forEach((column) => newVisible.add(column));
		setVisibleColumns(newVisible);
		setSelectedColumnsForAction(new Set());
		setIsManageColumnsOpen(false);
	};

	const handleEmptyRowChange = (rowIndex, column, value) => {
		const newEmptyRows = [...emptyRowsData];
		newEmptyRows[rowIndex] = {
			...newEmptyRows[rowIndex],
			[column]: value,
		};
		setEmptyRowsData(newEmptyRows);
	};

	const handleAddEmptyRow = () => {
		setEmptyRowsData([...emptyRowsData, {}]);
	};

	const handleExport = () => {
		const headers = CUSTOMER_COLUMNS.filter((col) => visibleColumns.has(col.key)).map(
			(col) => col.label
		);
		const csvContent = [
			headers.join(','),
			...customers.map((row) =>
				CUSTOMER_COLUMNS.filter((col) => visibleColumns.has(col.key))
					.map((col) => `"${row[col.key] || ''}"`)
					.join(',')
			),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'customer_data.csv';
		anchor.click();
	};

	return (
		<div className="min-h-screen bg-gray-50 p-4 md:p-6">
			<div className="max-w-[1600px] mx-auto border border-gray-300 bg-white p-4 md:p-6">
				<div className="mb-4 sticky top-0 z-30 bg-white/95 py-2 border-b border-gray-200 shadow-sm backdrop-blur">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<MasterNavigationDrawer inHeader />
							<h1 className="text-lg md:text-xl font-bold text-gray-900">MASTER CUSTOMER SHEET</h1>
						</div>
					</div>
				</div>

				<div className="max-w-full overflow-hidden">
					<div className="bg-white p-4 rounded-lg shadow-sm mb-6">
						<div className="flex flex-col lg:flex-row gap-4 mb-4">
							<div className="flex-1">
								<Input
									placeholder="Search by company name, GST, mobile, or email..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full"
								/>
							</div>
						</div>
						<div className="flex flex-wrap gap-2 justify-start lg:justify-end">
							<Button variant="outline" onClick={() => setIsManageColumnsOpen(true)}>
								Manage Columns
							</Button>
							<Button variant="outline" onClick={handleExport}>
								Export
							</Button>
							<Button variant="outline" onClick={() => window.print()}>
								Print
							</Button>
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-sm overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr className="bg-gray-100 border-b-2 border-gray-300">
									<th className="p-2 text-center border border-gray-400 w-12">
										<Checkbox
											checked={
												selectedRows.size ===
													(sortedCustomers.length > 0 ? sortedCustomers.length : emptyRowsData.length) &&
												selectedRows.size > 0
											}
											onCheckedChange={handleSelectAll}
											className="rounded"
										/>
									</th>
									{CUSTOMER_COLUMNS.filter(
										(column) => visibleColumns.has(column.key) && column.key !== '__select__'
									).map((column) => (
										<th
											key={column.key}
											className={`p-3 text-left text-xs font-semibold text-gray-700 ${
												columnConfig[column.key]?.headerBg || 'bg-gray-100'
											} ${columnConfig[column.key]?.minWidth} cursor-pointer hover:opacity-80`}
											onClick={() => handleSort(column.key)}
										>
											<div className="flex items-center gap-2">
												{column.label}
												{sortField === column.key && (
													<span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
												)}
											</div>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{sortedCustomers.length > 0 ? (
									sortedCustomers.map((row, index) => (
										<tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
											<td className="p-1 text-center border border-gray-400 w-12 bg-gray-50 text-xs font-medium">
												<div className="flex items-center justify-center gap-1">
													<Checkbox
														checked={selectedRows.has(index)}
														onCheckedChange={(checked) => handleSelectRow(index, checked)}
														className="rounded"
													/>
												</div>
											</td>
											{CUSTOMER_COLUMNS.filter(
												(column) => visibleColumns.has(column.key) && column.key !== '__select__'
											).map((column) => (
												<td
													key={`${index}-${column.key}`}
													className={`p-3 text-xs text-gray-700 border border-gray-400 ${columnConfig[column.key]?.minWidth}`}
												>
													{row[column.key] ? String(row[column.key]).substring(0, 50) : ''}
												</td>
											))}
										</tr>
									))
								) : (
									emptyRowsData.map((_, index) => (
										<tr key={`empty-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
											<td className="p-1 text-center border border-gray-400 w-12 bg-gray-50 text-xs font-medium">
												<div className="flex items-center justify-center gap-1">
													<Checkbox
														checked={selectedRows.has(index)}
														onCheckedChange={(checked) => handleSelectRow(index, checked)}
														className="rounded"
													/>
												</div>
											</td>
											{CUSTOMER_COLUMNS.filter(
												(column) => visibleColumns.has(column.key) && column.key !== '__select__'
											).map((column) => (
												<td
													key={`empty-${index}-${column.key}`}
													className={`p-1 text-xs border border-gray-400 ${columnConfig[column.key]?.minWidth}`}
												>
													<Input
														type="text"
														value={emptyRowsData[index]?.[column.key] || ''}
														onChange={(e) => handleEmptyRowChange(index, column.key, e.target.value)}
														placeholder=""
														className="border-0 p-1 h-7 text-xs"
													/>
												</td>
											))}
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{isLoading && <p className="mt-2 text-xs text-gray-600">Loading customer data...</p>}
					{error && <p className="mt-2 text-xs text-red-600">{error}</p>}

					<div className="mt-4 flex gap-2 items-center">
						{sortedCustomers.length === 0 && (
							<Button
								onClick={handleAddEmptyRow}
								className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
							>
								+ Add Row
							</Button>
						)}
						<div className="flex gap-6 text-xs text-gray-600 ml-2">
							<span>Selected Rows: {selectedRows.size}</span>
							<span>Visible Rows: {sortedCustomers.length || emptyRowsData.length}</span>
						</div>
					</div>
				</div>
			</div>

			<Dialog open={isManageColumnsOpen} onOpenChange={setIsManageColumnsOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Manage Columns</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 max-h-[400px] overflow-y-auto py-4">
						<div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-300">
							<div className="flex items-center gap-3 flex-1">
								<Checkbox
									id="select-all-columns"
									checked={
										selectedColumnsForAction.size ===
											CUSTOMER_COLUMNS.filter((column) => column.key !== '__select__').length &&
										selectedColumnsForAction.size > 0
									}
									onCheckedChange={handleSelectAllColumns}
									className="cursor-pointer"
								/>
								<label htmlFor="select-all-columns" className="text-sm font-semibold cursor-pointer">
									Select All
								</label>
							</div>
						</div>
						{CUSTOMER_COLUMNS.filter((column) => column.key !== '__select__').map((column) => (
							<div key={column.key} className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-3 flex-1">
									<Checkbox
										id={column.key}
										checked={selectedColumnsForAction.has(column.key)}
										onCheckedChange={() => toggleColumnSelection(column.key)}
										className="cursor-pointer"
									/>
									<label htmlFor={column.key} className="text-sm cursor-pointer">
										{column.label}
									</label>
								</div>
								<div className="text-xs font-semibold px-2 py-1 rounded">
									{!visibleColumns.has(column.key) ? (
										<span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">Hidden</span>
									) : (
										<span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Visible</span>
									)}
								</div>
							</div>
						))}
					</div>
					<DialogFooter className="flex gap-2">
						<Button
							onClick={handleHideColumns}
							disabled={selectedColumnsForAction.size === 0}
							variant="outline"
							className="text-red-600 border-red-300 hover:bg-red-50"
						>
							Hide
						</Button>
						<Button
							onClick={handleShowColumns}
							disabled={selectedColumnsForAction.size === 0}
							variant="outline"
							className="text-green-600 border-green-300 hover:bg-green-50"
						>
							Show
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
