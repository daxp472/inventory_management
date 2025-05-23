import React, { useState, useEffect, useContext } from "react";
import { ShopContext } from '../ShopContext/ShopContext.jsx';
import { Plus, Trash2 } from "lucide-react";
import { fetchStock, fetchCurrentStock, fetchCustomers, createSale, fetchSales, deleteSale, fetchNextBillNumber, addCreditSale } from "../api.js";
import "./SalesEntry.css";

const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const getCurrentISTDate = () => {
  const now = new Date();
  const istOffsetMinutes = 5.5 * 60; // 5 hours 30 minutes
  const istDate = new Date(now.getTime() + (istOffsetMinutes * 60 * 1000));
  return istDate.toISOString().split("T")[0]; // Returns YYYY-MM-DD
};

const SalesEntry = () => {
  const { shop, setShop } = useContext(ShopContext)
  const [customers, setCustomers] = useState([]);
  const [stock, setStock] = useState([]);
  const [groupedStock, setGroupedStock] = useState([]);
  const [sales, setSales] = useState([]);
  const [newSale, setNewSale] = useState({
    billNo: "",
    date: formatDateToDDMMYYYY(getCurrentISTDate()),
    profileName: "",
    phoneNumber: "",
    paymentType: "Cash",
    items: [],
    otherExpenses: "0",
  });
  const [currentItem, setCurrentItem] = useState({
    product: "",
    qty: "",
    unit: "",
    pricePerQty: "",
    category: "",
  });
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [warning, setWarning] = useState("");
  const [isDateEditable, setIsDateEditable] = useState(false);
  const [isItemSearchManual, setIsItemSearchManual] = useState(false);
  const [advanceSearchTerm, setAdvanceSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(formatDateToDDMMYYYY(getCurrentISTDate()));
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadBillNumber = async () => {
      try {
        const shopApiName = shop === "Shop 1" ? "Shop 1" : "Shop 2";
        const { billNo } = await fetchNextBillNumber(shopApiName);
        setNewSale((prev) => ({ ...prev, billNo }));
      } catch (err) {
        console.error("fetchNextBillNumber error:", err);
        setWarning("Failed to fetch bill number.");
      }
    };
    loadBillNumber();
  }, [shop]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        setWarning("");
        const shopApiName = shop === "Shop 1" ? "Shop 1" : "Shop 2";
        const [stockData, groupedStockData, customerData, salesData] = await Promise.all([
          fetchStock(shopApiName).catch((err) => {
            console.error("fetchStock error:", err);
            return [];
          }),
          fetchCurrentStock(shopApiName).catch((err) => {
            console.error("fetchCurrentStock error:", err);
            return [];
          }),
          fetchCustomers(shopApiName).catch((err) => {
            console.error("fetchCustomers error:", err);
            return [];
          }),
          fetchSales(shopApiName).catch((err) => {
            console.error("fetchSales error:", err);
            return [];
          }),
        ]);
        setStock(Array.isArray(stockData) ? stockData : []);
        setGroupedStock(Array.isArray(groupedStockData) ? groupedStockData : []);
        setCustomers(Array.isArray(customerData.customers) ? customerData.customers : []);
        setSales(Array.isArray(salesData) ? salesData : []);
      } catch (err) {
        console.error("loadData error:", err);
        setWarning("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [shop]);

  useEffect(() => {
    const loadSales = async () => {
      setIsLoading(true);
      try {
        setWarning("");
        const shopApiName = shop === "Shop 1" ? "Shop 1" : "Shop 2";
        const salesData = await fetchSales(shopApiName, filterDate, searchTerm).catch((err) => {
          console.error("fetchSales error:", err);
          return [];
        });
        setSales(Array.isArray(salesData) ? salesData : []);
      } catch (err) {
        console.error("loadSales error:", err);
        setWarning("Failed to load sales. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadSales();
  }, [shop, filterDate, searchTerm]);

  useEffect(() => {
    setNewSale({
      billNo: '',
      date: formatDateToDDMMYYYY(getCurrentISTDate()),
      profileName: '',
      phoneNumber: '',
      paymentType: 'Cash',
      items: [],
      otherExpenses: '0',
    });
    setCurrentItem({ product: '', qty: '', unit: '', pricePerQty: '', category: '' });
    setAdvanceSearchTerm('');
    setSearchTerm('');
    setIsCustomUnit(false);
    setIsDateEditable(false);
    setIsItemSearchManual(false);
    setWarning('');
  }, [shop]);

  const getGroupedStock = () => {
    const mergedStock = groupedStock.reduce((acc, item) => {
      const key = `${item.name.toLowerCase()}|${item.category.toLowerCase()}|${item.unit.toLowerCase()}`;
      if (!acc[key]) {
        acc[key] = {
          id: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          quantity: 0,
          totalPrice: 0,
          count: 0,
        };
      }
      acc[key].quantity += item.quantity;
      acc[key].totalPrice += item.price * item.quantity;
      acc[key].count += item.quantity;
      return acc;
    }, {});

    return Object.values(mergedStock).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      price: item.count > 0 ? item.totalPrice / item.count : 0,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "date") {
      setNewSale((prev) => ({
        ...prev,
        [name]: formatDateToDDMMYYYY(value),
      }));
    } else {
      setNewSale((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePaymentTypeChange = (e) => {
    const paymentType = e.target.value;
    setNewSale((prev) => ({ ...prev, paymentType }));
    if (paymentType === "Advance") {
      setAdvanceSearchTerm("");
    }
  };

  const handleAdvanceProfileSelect = (e) => {
    const value = e.target.value;
    const match = value.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      const profileName = match[1].trim();
      const phoneNumber = match[2].trim();
      setNewSale((prev) => ({
        ...prev,
        profileName,
        phoneNumber,
      }));
      setAdvanceSearchTerm(value);
    } else {
      setAdvanceSearchTerm(value);
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    if (name === "product") {
      const selectedItem = getGroupedStock().find((item) => item.name.toLowerCase() === value.toLowerCase());
      setCurrentItem((prev) => ({
        ...prev,
        product: value,
        unit: selectedItem ? selectedItem.unit : "",
        pricePerQty: selectedItem ? Number(selectedItem.price).toFixed(2) : "",
        category: selectedItem ? selectedItem.category : "",
      }));
    } else {
      setCurrentItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleDateEditable = () => {
    setIsDateEditable((prev) => {
      if (prev) {
        setNewSale((prevSale) => ({
          ...prevSale,
          date: formatDateToDDMMYYYY(new Date().toISOString().split("T")[0]),
        }));
      }
      return !prev;
    });
  };

  const addItemToSale = () => {
    if (!currentItem.product || !currentItem.qty || !currentItem.unit || !currentItem.pricePerQty) {
      alert("Please fill all item fields, including unit and price");
      return;
    }

    const qty = parseFloat(currentItem.qty);
    const pricePerQty = parseFloat(currentItem.pricePerQty);
    const amount = qty * pricePerQty;

    const stockItem = getGroupedStock().find(
      (item) =>
        item.name.toLowerCase() === currentItem.product.toLowerCase() &&
        item.category.toLowerCase() === currentItem.category.toLowerCase() &&
        item.unit.toLowerCase() === currentItem.unit.toLowerCase()
    );

    if (!stockItem || stockItem.quantity < qty) {
      alert("Insufficient stock or invalid product");
      return;
    }

    if (!isCustomUnit && stockItem.unit !== currentItem.unit) {
      alert("Unit mismatch with stock item");
      return;
    }

    setNewSale((prev) => ({
      ...prev,
      items: [...prev.items, { ...currentItem, qty, pricePerQty, amount }],
    }));
    setCurrentItem({ product: "", qty: "", unit: "", pricePerQty: "", category: "" });
    setIsCustomUnit(false);
  };

  const removeItem = (index) => {
    setNewSale((prev) => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      if (updatedItems.length === 0) {
        setIsCustomUnit(false);
      }
      return { ...prev, items: updatedItems };
    });
  };

  const getAveragePrice = (product, category, unit) => {
    const stockItem = getGroupedStock().find(
      (item) =>
        item.name.toLowerCase() === product.toLowerCase() &&
        item.category.toLowerCase() === category.toLowerCase() &&
        item.unit.toLowerCase() === unit.toLowerCase()
    );
    return stockItem ? stockItem.price.toFixed(2) : "0.00";
  };

  const getItemTotal = () => {
    const qty = parseFloat(currentItem.qty) || 0;
    const pricePerQty = parseFloat(currentItem.pricePerQty) || 0;
    return (qty * pricePerQty).toFixed(2);
  };

  const handleDeleteSale = async (billNo, profileId, phoneNumber, items) => {
    if (!window.confirm("Are you sure you want to delete this sale?")) {
      return;
    }

    setIsLoading(true);
    try {
      setWarning("");
      const shopApiName = shop === "Shop 1" ? "Shop 1" : "Shop 2";

      const enrichedItems = items.map(item => {
        const stockItem = groupedStock.find(
          s => s.name === item.product && s.unit === item.unit
        );
        return {
          ...item,
          category: stockItem ? stockItem.category : 'Unknown',
        };
      });

      const response = await deleteSale(shopApiName, billNo, profileId, phoneNumber, enrichedItems);
      const { updatedCustomer } = response;

      const [stockData, groupedStockData, customerData, salesData] = await Promise.all([
        fetchStock(shopApiName).catch((err) => {
          console.error("fetchStock error:", err);
          return [];
        }),
        fetchCurrentStock(shopApiName).catch((err) => {
          console.error("fetchCurrentStock error:", err);
          return [];
        }),
        fetchCustomers(shopApiName).catch((err) => {
          console.error("fetchCustomers error:", err);
          return [];
        }),
        fetchSales(shopApiName, filterDate, searchTerm).catch((err) => {
          console.error("fetchSales error:", err);
          return [];
        }),
      ]);

      setStock(Array.isArray(stockData) ? stockData : []);
      setGroupedStock(Array.isArray(groupedStockData) ? groupedStockData : []);
      setCustomers((prev) =>
        prev
          .map((c) =>
            c.phoneNumber === updatedCustomer.phoneNumber ? updatedCustomer : c
          )
          .concat(
            updatedCustomer.phoneNumber && !prev.some((c) => c.phoneNumber === updatedCustomer.phoneNumber)
              ? [updatedCustomer]
              : []
          )
      );
      setSales(Array.isArray(salesData) ? salesData : []);

      setWarning("Sale deleted successfully");
    } catch (err) {
      console.error("deleteSale error:", err);
      setWarning(`Failed to delete sale: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSale = async () => {
    if (!newSale.profileName || !newSale.phoneNumber) {
      setWarning("Please enter both profile name and phone number");
      return false;
    }

    if (newSale.items.length === 0) {
      setWarning("Please add at least one item to the sale");
      return false;
    }

    if (!newSale.otherExpenses || isNaN(parseFloat(newSale.otherExpenses)) || parseFloat(newSale.otherExpenses) < 0) {
      setWarning("Please enter a valid other expenses amount (non-negative number)");
      return false;
    }

    setIsLoading(true);
    try {
      setWarning("");
      const shopApiName = shop === "Shop 1" ? "Shop 1" : "Shop 2";
      let paymentMethod = newSale.paymentType;
      const customer = customers.find(c => c.phoneNumber === newSale.phoneNumber);
      let profileExists = false;
      let bill = null;

      if (customer) {
        const profile = customer.profiles.find(p => p.name === newSale.profileName && !p.deleteuser?.value);
        if (profile && newSale.paymentType === 'Advance' && profile.advance?.value) {
          paymentMethod = 'Advance';
          profileExists = true;
        } else if (profile) {
          paymentMethod = newSale.paymentType;
          profileExists = true;
        }
      }

      const totalAmount = newSale.items.reduce((sum, item) => sum + item.amount, 0) + parseFloat(newSale.otherExpenses || 0);
      const saleData = {
        profileName: newSale.profileName,
        phoneNumber: newSale.phoneNumber,
        paymentMethod,
        items: newSale.items,
        date: newSale.date,
        otherExpenses: parseFloat(newSale.otherExpenses || 0), // Include otherExpenses
      };

      if (newSale.paymentType === 'Credit') {
        const creditSaleData = {
          customerName: newSale.profileName,
          phoneNumber: newSale.phoneNumber,
          items: newSale.items.map(item => ({
            product: item.product,
            qty: item.qty,
            unit: item.unit,
            pricePerUnit: item.pricePerQty,
            amount: item.amount,
            date: newSale.date.split('-').reverse().join('-'),
            category: item.category,
          })),
          totalAmount,
          otherExpenses: parseFloat(newSale.otherExpenses || 0), // Include otherExpenses
        };

        const response = await addCreditSale(shopApiName, creditSaleData);
        const { creditSale, customer: updatedCustomer } = response;

        bill = {
          billNo: creditSale.billNumber,
          date: newSale.date,
          items: newSale.items,
          totalAmount,
          creditAmount: totalAmount,
          paymentMethod: 'Credit',
          shop: shopApiName,
          otherExpenses: parseFloat(newSale.otherExpenses || 0), // Include otherExpenses
        };

        setStock(await fetchStock(shopApiName).catch((err) => {
          console.error("fetchStock error:", err);
          return [];
        }));
        setGroupedStock(await fetchCurrentStock(shopApiName).catch((err) => {
          console.error("fetchCurrentStock error:", err);
          return [];
        }));
        setCustomers((prev) =>
          prev
            .map((c) =>
              c.phoneNumber === updatedCustomer.phoneNumber ? updatedCustomer : c
            )
            .concat(
              updatedCustomer.phoneNumber && !prev.some((c) => c.phoneNumber === updatedCustomer.phoneNumber)
                ? [updatedCustomer]
                : []
            )
        );
        setSales(await fetchSales(shopApiName, filterDate, searchTerm).catch((err) => {
          console.error("fetchSales error:", err);
          return [];
        }));
      } else {
        if (!profileExists) {
          saleData.newProfile = {
            name: newSale.profileName,
            advance: newSale.paymentType === 'Advance' ? {
              value: true,
              currentamount: 0,
              showinadvance: true,
              paymentMethod: newSale.paymentType
            } : undefined,
            paymentMethod: newSale.paymentType !== 'Advance' ? newSale.paymentType : "",
            credit: newSale.paymentType === 'Credit' ? totalAmount : 0,
            advanceHistory: [],
            bills: [],
            deleteuser: { value: false, date: "" },
          };
        }

        const response = await createSale(shopApiName, saleData);
        const { bill: createdBill, customer: updatedCustomer } = response;
        bill = createdBill;

        setStock(await fetchStock(shopApiName).catch((err) => {
          console.error("fetchStock error:", err);
          return [];
        }));
        setGroupedStock(await fetchCurrentStock(shopApiName).catch((err) => {
          console.error("fetchCurrentStock error:", err);
          return [];
        }));
        setCustomers((prev) =>
          prev
            .map((c) =>
              c.phoneNumber === updatedCustomer.phoneNumber ? updatedCustomer : c
            )
            .concat(
              updatedCustomer.phoneNumber && !prev.some((c) => c.phoneNumber === updatedCustomer.phoneNumber)
                ? [updatedCustomer]
                : []
            )
        );
        setSales(await fetchSales(shopApiName, filterDate, searchTerm).catch((err) => {
          console.error("fetchSales error:", err);
          return [];
        }));
      }

      const { billNo } = await fetchNextBillNumber(shopApiName);

      setNewSale({
        billNo,
        date: formatDateToDDMMYYYY(new Date().toISOString().split("T")[0]),
        profileName: "",
        phoneNumber: "",
        paymentType: "Cash",
        items: [],
        otherExpenses: "", // Reset otherExpenses
      });
      setAdvanceSearchTerm("");
      setWarning("Sale created successfully");
      return bill;
    } catch (err) {
      console.error("createSale error:", err);
      setWarning(`Failed to create sale: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaleEntry = async () => {
    await saveSale();
  };

  const handleGenerateBillAndSale = async () => {
    const bill = await saveSale();
    if (bill) {
      handlePrintBill(bill, bill.profileName, bill.phoneNumber);
    }
  };

  const handleGenerateBill = async () => {
    const bill = await saveSale();
    if (bill) {
      handlePrintBill(bill, bill.profileName, bill.phoneNumber);
    }
  };

  const handlePrintBill = (bill, profileName, phoneNumber) => {
    const printWindow = window.open("", "_blank");
    let billContent = `
    <html>
      <head>
        <title>Bill ${bill.billNo}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
          h2 { color: #ff6b35; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #3a3a5a; padding: 10px; text-align: left; }
          th { background-color: #2b2b40; color: #a1a5b7; }
          td { background-color: #1e1e2d; color: #ffffff; }
          .total { font-weight: bold; }
          .payment-method { margin-top: 10px; font-style: italic; }
        </style>
      </head>
      <body>
        <h2>Bill No: ${bill.billNo}</h2>
        <p>Profile Name: ${profileName}</p>
        <p>Phone Number: ${phoneNumber}</p>
        <p>Date: ${bill.date}</p>
        <p class="payment-method">Payment Method: ${bill.paymentMethod ?? "N/A"}</p>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price/Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bill.items
        .map(
          (item) => `
              <tr>
                <td>${item.product}</td>
                <td>${item.qty}</td>
                <td>₹${item.pricePerQty}</td>
                <td>₹${item.amount}</td>
              </tr>
            `
        )
        .join("")}
            <tr className="total">
              <td colspan="3">Items Total</td>
              <td>₹${bill.items.reduce((sum, item) => sum + item.amount, 0)}</td>
            </tr>
            <tr className="total">
              <td colspan="3">Other Expenses</td>
              <td>₹${parseInt(bill.otherExpenses || 0)}</td>
            </tr>
            <tr className="total">
              <td colspan="3">Grand Total</td>
              <td>₹${(bill.totalAmount).toFixed(2)}</td>
            </tr>
  `;

    if (bill.advanceRemaining !== undefined) {
      billContent += `
            <tr className="total">
              <td colspan="3">Advance Remaining</td>
              <td>₹${bill.advanceRemaining}</td>
            </tr>
          `;
    }

    if (bill.creditAmount) {
      billContent += `
            <tr className="total">
              <td colspan="3">Credit Amount</td>
              <td>₹${bill.creditAmount}</td>
            </tr>
          `;
    }

    billContent += `
          </tbody>
        </table>
      </body>
    </html>
  `;

    printWindow.document.write(billContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDateFilterChange = (e) => {
    setFilterDate(formatDateToDDMMYYYY(e.target.value));
  };

  const handleSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const allSales = Array.isArray(sales)
    ? sales.filter((sale) => {
      // Convert sale.date to DD-MM-YYYY for comparison
      let saleDate = sale.date;
      if (sale.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = sale.date.split("-");
        saleDate = `${day}-${month}-${year}`;
      }
      return filterDate ? saleDate === filterDate : true;
    }).filter((sale) =>
      searchTerm
        ? sale.profileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.phoneNumber.includes(searchTerm)
        : true
    )
    : [];

  const salesByDate = allSales.reduce((acc, sale) => {
    if (!acc[sale.date]) {
      acc[sale.date] = [];
    }
    acc[sale.date].push(sale);
    return acc;
  }, {});

  const sortedDates = Object.keys(salesByDate).sort(
    (a, b) => {
      const [dayA, monthA, yearA] = a.split("-").map(Number);
      const [dayB, monthB, yearB] = b.split("-").map(Number);
      return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
    }
  );

  const totalAmount = newSale.items.reduce((sum, item) => sum + item.amount, 0);

  const advanceProfiles = customers
    .flatMap((c) =>
      Array.isArray(c.profiles)
        ? c.profiles
          .filter((p) => p.advance?.value && !p.deleteuser?.value)
          .map((p) => ({ ...p, phoneNumber: c.phoneNumber }))
        : []
    );

  return (
    <div className="main-content">
      {isLoading && <div className="loading-message">Loading...</div>}
      {warning}
      <div className="sales-form-container-p">
        <div className="form-group-p shop-selector-p">
        </div>
        <h2>New Sale Entry - {shop}</h2>
        <div className="sales-form-p">
          <div className="form-group-p">
            <label>Bill No</label>
            <input
              type="text"
              name="billNo"
              value={newSale.billNo}
              readOnly
            />
          </div>
          <div className="form-group-p">
            <label>
              Date
              <input
                type="checkbox"
                checked={isDateEditable}
                onChange={toggleDateEditable}
                style={{ marginLeft: "8px", marginRight: "4px" }}
              />
              Manual Date
            </label>
            <input
              type="date"
              name="date"
              value={newSale.date.split("-").reverse().join("-")}
              onChange={(e) => handleInputChange({ target: { name: "date", value: e.target.value } })}
              readOnly={!isDateEditable}
            />
          </div>
          <div className="form-group-p">
            <label>Profile Name</label>
            {newSale.paymentType === "Advance" ? (
              <>
                <input
                  type="text"
                  value={advanceSearchTerm}
                  onChange={handleAdvanceProfileSelect}
                  placeholder="Search advance profiles"
                  list="advance-profiles"
                />
                <datalist id="advance-profiles">
                  {advanceProfiles
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(advanceSearchTerm.toLowerCase()) ||
                        p.phoneNumber.includes(advanceSearchTerm)
                    )
                    .map((p) => (
                      <option key={p.profileId} value={`${p.name} (${p.phoneNumber})`} />
                    ))}
                </datalist>
              </>
            ) : (
              <input
                type="text"
                name="profileName"
                value={newSale.profileName}
                onChange={handleInputChange}
                placeholder="Enter profile name"
              />
            )}
          </div>
          <div className="form-group-p">
            <label>Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={newSale.phoneNumber}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              readOnly={newSale.paymentType === "Advance"}
            />
          </div>
          <div className="form-group-p">
            <label>Payment Type</label>
            <select
              name="paymentType"
              value={newSale.paymentType}
              onChange={handlePaymentTypeChange}
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit">Credit</option>
              <option value="Advance">Advance</option>
            </select>
          </div>
          <div className="form-group-p item-row-p">
            <div style={{ flex: "2", marginRight: "10px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={isItemSearchManual}
                  onChange={() => setIsItemSearchManual(!isItemSearchManual)}
                  style={{ marginRight: "8px" }}
                />
                Manual Search
              </label>
              {isItemSearchManual ? (
                <>
                  <input
                    type="text"
                    name="product"
                    value={currentItem.product}
                    onChange={handleItemChange}
                    placeholder="Search items"
                    list="stock-items"
                  />
                  <datalist id="stock-items">
                    {getGroupedStock().map((item) => (
                      <option key={`${item.name}|${item.category}|${item.unit}`} value={item.name}>
                        {item.name} (Qty: {item.quantity} {item.unit})
                      </option>
                    ))}
                  </datalist>
                </>
              ) : (
                <select
                  name="product"
                  value={currentItem.product}
                  onChange={handleItemChange}
                >
                  <option value="">Select item</option>
                  {getGroupedStock().map((item) => (
                    <option key={`${item.name}|${item.category}|${item.unit}`} value={item.name}>
                      {item.name} (Qty: {item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <input
              type="number"
              name="qty"
              placeholder="Qty"
              value={currentItem.qty}
              onChange={handleItemChange}
              min="1"
              className="small-input-p"
            />
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={isCustomUnit}
                  onChange={() => setIsCustomUnit(!isCustomUnit)}
                  style={{ marginRight: "8px" }}
                />
                Manual
              </label>
              {isCustomUnit ? (
                <input
                  type="text"
                  name="unit"
                  placeholder="Enter unit"
                  value={currentItem.unit}
                  onChange={handleItemChange}
                  className="small-input-p"
                  style={{ flex: "1", marginRight: "10px" }}
                />
              ) : (
                <select
                  style={{ flex: "1", marginRight: "10px" }}
                  name="unit"
                  value={currentItem.unit}
                  onChange={handleItemChange}
                  className="small-input-p"
                >
                  <option value="">unit</option>
                  <option value="KG">KG</option>
                  <option value="Bag">Bag</option>
                  <option value="Pieces">Pieces</option>
                  <option value="Liter">Liter</option>
                </select>
              )}
            </div>
            <input
              type="number"
              name="pricePerQty"
              placeholder="Price"
              value={currentItem.pricePerQty}
              onChange={handleItemChange}
              className="small-input-p"
            />
            <input
              type="text"
              value={currentItem.product && currentItem.qty && currentItem.pricePerQty ? `₹${getItemTotal()}` : "₹0.00"}
              readOnly
              className="small-input-p"
              disabledd
            />
            <button
              className="add-item-btn-p"
              onClick={addItemToSale}
              disabled={!currentItem.product || !currentItem.qty || !currentItem.unit || !currentItem.pricePerQty || isLoading}
              style={{ flex: "1" }}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
          {newSale.items.length > 0 && (
            <table className="items-table-p">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Price/Unit</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {newSale.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.product}</td>
                    <td>{item.qty}</td>
                    <td>{item.unit}</td>
                    <td>₹{item.pricePerQty}</td>
                    <td>₹{item.amount}</td>
                    <td>
                      <button className="delete-btn" onClick={() => removeItem(index)} disabled={isLoading}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="4">Other Expenses</td>
                  <td>
                    <input
                      type="number"
                      name="otherExpenses"
                      value={newSale.otherExpenses}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '5px' }}
                    />
                  </td>
                  <td></td>
                </tr>
                <tr className="total-row-p">
                  <td colSpan="4">Items Total</td>
                  <td colSpan="2">₹{newSale.items.reduce((sum, item) => sum + item.amount, 0)}</td>
                </tr>
                <tr className="total-row-p">
                  <td colSpan="4">Other Expenses</td>
                  <td colSpan="2">₹{parseFloat(newSale.otherExpenses || 0).toFixed(2)}</td>
                </tr>
                <tr className="total-row-p">
                  <td colSpan="4">Grand Total</td>
                  <td colSpan="2">₹{(newSale.items.reduce((sum, item) => sum + item.amount, 0) + parseFloat(newSale.otherExpenses || 0)).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <div className="form-buttons-p">
            <button
              className="sale-entry-btn-p"
              onClick={handleSaleEntry}
              disabled={newSale.items.length === 0 || !newSale.profileName || !newSale.phoneNumber || isLoading}
            >
              Sale Entry
            </button>
            <button
              className="generate-sale-btn-p"
              onClick={handleGenerateBillAndSale}
              disabled={newSale.items.length === 0 || !newSale.profileName || !newSale.phoneNumber || isLoading}
            >
              Generate Bill & Sale Entry
            </button>
            <button
              className="generate-btn-p"
              onClick={handleGenerateBill}
              disabled={newSale.items.length === 0 || !newSale.profileName || !newSale.phoneNumber || isLoading}
            >
              Generate Bill
            </button>
          </div>
        </div>
      </div>

      <div className="recent-sales-container-p">
        <h2>Today Sales</h2>
        <div className="sales-filter-row-p">
          <label>Date:</label>
          <input
            type="date"
            value={filterDate ? filterDate.split("-").reverse().join("-") : ""}
            onChange={handleDateFilterChange}
          />
          <label>Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchTermChange}
            placeholder="Profile or phone"
          />
        </div>
        {sortedDates.length > 0 ? (
          sortedDates.map((date) => (
            <div key={date}>
              <h3 style={{ color: "#ff6b35", margin: "20px 0 10px" }}>{date}</h3>
              <table
                className="sales-table-p"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: "10px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#2b2b40",
                      color: "#a1a5b7",
                    }}
                  >
                    <th style={{ border: "1px solid #3a3a5a", padding: "10px", textAlign: "left" }}>
                      Profile
                    </th>
                    <th style={{ border: "1px solid #3a3a5a", padding: "10px", textAlign: "left" }}>
                      Bill No
                    </th>
                    <th style={{ border: "1px solid #3a3a5a", padding: "10px", textAlign: "left" }}>
                      Items
                    </th>
                    <th style={{ border: "1px solid #3a3a5a", padding: "10px", textAlign: "left" }}>
                      Total
                    </th>
                    <th style={{ border: "1px solid #3a3a5a", padding: "10px", textAlign: "left" }}>
                      Payment Method
                    </th>
                    <th style={{ border: "1px solid #3a3a5a", padding: "10px", textAlign: "left" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {salesByDate[date]
                    .sort((a, b) => a.billNo.localeCompare(b.billNo))
                    .map((sale) => (
                      <tr key={sale.billNo}>
                        <td style={{ border: "1px solid #3a3a5a", padding: "10px" }}>
                          {sale.profileName}
                        </td>
                        <td style={{ border: "1px solid #3a3a5a", padding: "10px" }}>
                          {sale.billNo}
                        </td>
                        <td
                          style={{ border: "1px solid #3a3a5a", padding: "10px" }}
                          dangerouslySetInnerHTML={{
                            __html: sale.items
                              .map(
                                (item) =>
                                  `${item.product}: ${item.qty} ${item.unit}`
                              )
                              .join("<br />"),
                          }}
                        />
                        <td style={{ border: "1px solid #3a3a5a", padding: "10px" }}>
                          ₹{sale.totalAmount}
                        </td>
                        <td style={{ border: "1px solid #3a3a5a", padding: "10px" }}>
                          {sale.paymentMethod ?? "N/A"}
                        </td>
                        <td style={{ border: "1px solid #3a3a5a", padding: "10px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="print-btn"
                              onClick={() =>
                                handlePrintBill(
                                  {
                                    billNo: sale.billNo,
                                    date: sale.date,
                                    items: sale.items,
                                    totalAmount: sale.totalAmount,
                                    advanceRemaining: sale.advanceRemaining,
                                    creditAmount: sale.creditAmount,
                                    paymentMethod: sale.paymentMethod,
                                    otherExpenses: sale.otherExpenses,
                                    profit: sale.profit,
                                  },
                                  sale.profileName,
                                  sale.phoneNumber
                                )
                              }
                              disabled={isLoading}
                            >
                              Print Bill
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() =>
                                handleDeleteSale(
                                  sale.billNo,
                                  sale.profileId,
                                  sale.phoneNumber,
                                  sale.items
                                )
                              }
                              disabled={isLoading}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <p>No sales found.</p>
        )}
      </div>
    </div>
  );
};

export default SalesEntry;