import React, { useEffect, useState, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./QueryChat.css";
import { motion, AnimatePresence } from "framer-motion";
// import uploadSvg from "./assets/upload.svg";
import uploadSvg from "../../assets/upload.svg";
import prompts from "../propmts/prompts";
import { marked } from "marked";
import { MoonLoader } from "react-spinners";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const QueryChat = () => {
  const [query, setQuery] = useState("");
  const [randomPrompt, setRandomPrompt] = useState("");
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * prompts.length);
    setRandomPrompt(prompts[randomIndex]);
  }, []);

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const response = await axios.post(
        "https://real-estate-chatbot-server-str3.onrender.com/api/query/",
        {
          query,
        }
      );

      const data = response.data;
      console.log(data);

      const newResponse = {
        query,
        summary: data.summary || data.error,
        chartData: null,
        lineChartData: null,
        tableData: data.table_data || null,
      };

      // Bar Chart (Price Trend)
      if (data.chart_data?.price) {
        const labels = data.chart_data.price.map((item) => item.year);
        const values = data.chart_data.price.map((item) => item.value);

        newResponse.chartData = {
          labels,
          datasets: [
            {
              label: "Average Price per sq ft (₹)",
              data: values,
              backgroundColor: "rgba(75, 192, 192, 0.6)",
            },
          ],
        };
      }

      // Line Chart (Demand Trend)
      if (data.chart_data?.demand) {
        const grouped = {};
        data.chart_data.demand.forEach((item) => {
          if (!grouped[item.location]) grouped[item.location] = [];
          grouped[item.location].push(item);
        });

        Object.keys(grouped).forEach((location) => {
          grouped[location].sort((a, b) => a.year - b.year);
        });

        const labels = [
          ...new Set(data.chart_data.demand.map((item) => item.year)),
        ].sort();

        const colors = [
          "rgba(255,99,132,0.8)",
          "rgba(54,162,235,0.8)",
          "rgba(255,206,86,0.8)",
          "rgba(75,192,192,0.8)",
          "rgba(153,102,255,0.8)",
          "rgba(255,159,64,0.8)",
        ];

        const datasets = Object.entries(grouped).map(
          ([location, items], index) => ({
            label: location,
            data: labels.map(
              (year) => items.find((i) => i.year === year)?.value || 0
            ),
            fill: false,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length],
            tension: 0.3,
          })
        );

        newResponse.lineChartData = {
          labels,
          datasets,
        };
      }

      // Add new response at the bottom
      setHistory((prev) => [...prev, newResponse]);
      setQuery("");
    } catch (error) {
      console.error("Axios error:", error);
      alert("Error fetching data.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTableAsCSV = (tableData) => {
    if (!tableData || tableData.length === 0) return;

    const headers = Object.keys(tableData[0]);
    const csvRows = [
      headers.join(","),
      ...tableData.map((row) =>
        headers.map((header) => `"${row[header] ?? ""}"`).join(",")
      ),
    ];

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "property_data.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={
        history.length > 0
          ? "query-chat-container"
          : "query-chat-container-not-active"
      }
    >
      {history.length === 0 && (
        <motion.div
          className="landing-div"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          onClick={() => {
            setQuery(randomPrompt);
            inputRef.current?.focus();
          }}
        >
          <h1>Ask: "{randomPrompt}"</h1>
        </motion.div>
      )}

      <div className="query-form">
        <input
          type="text"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleQuery();
          }}
          placeholder="Ask about real estate..."
          className="query-input"
        />
        {isLoading ? (
          <div className="upload-svg">
            <MoonLoader color="#1E90FF" size={20} speedMultiplier={1} />
          </div>
        ) : (
          <img
            src={uploadSvg}
            alt="submit"
            className="upload-svg"
            style={{ width: "30px", height: "30px", cursor: "pointer" }}
            onClick={handleQuery}
          />
        )}
      </div>

      {history.map((entry, idx) => (
        <div key={idx} className="response-block">
          <div className="query-label">
            <strong>{entry.query}</strong>
          </div>

          <hr className="response-divider" />

          <h2 className="summray-title">Summary:</h2>
          <AnimatePresence mode="wait">
            <motion.div
              key={entry.summary}
              className="summary-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              dangerouslySetInnerHTML={{ __html: marked(entry.summary) }}
            />
          </AnimatePresence>

          {entry.chartData && (
            <div className="chart-section">
              <h2>Price Trend</h2>
              <Bar data={entry.chartData} options={{ responsive: true }} />
            </div>
          )}

          {entry.lineChartData && (
            <div className="chart-section">
              <h2>Demand Trend (All Locations)</h2>
              <Line
                data={entry.lineChartData}
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: "Demand Trend by Location",
                    },
                    legend: {
                      display: true,
                      position: "top",
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: "Units Sold",
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: "Year",
                      },
                    },
                  },
                }}
              />
            </div>
          )}

          {entry.tableData && entry.tableData.length > 0 && (
            <>
              <div className="row header-row">
                <h2 className="section-title">Property Statistics</h2>
                <button
                  className="download-button"
                  onClick={() => downloadTableAsCSV(entry.tableData)}
                >
                  Download CSV
                </button>
              </div>
              <div className="table-section">
                <table className="query-table">
                  <thead>
                    <tr>
                      {Object.keys(entry.tableData[0]).map((key) => (
                        <th key={key}>{key.replace(/_/g, " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entry.tableData.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {Object.values(row).map((value, idx) => (
                          <td key={idx}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default QueryChat;
