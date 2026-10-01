import { useState, useEffect } from "react";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";
import "./App.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

function App() {
  const [activityType, setActivityType] = useState("Transport");
  const [amount, setAmount] = useState("");



  const [activities, setActivities] = useState(() => {
    const savedActivities = localStorage.getItem("activities");

    return savedActivities
      ? JSON.parse(savedActivities)
      : [];
  });

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [editingIndex, setEditingIndex] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "activities",
      JSON.stringify(activities)
    );
  }, [activities]);

  const availableDates = [
    ...new Set(
      activities
        .filter((activity) => activity.date)
        .map((activity) => activity.date.split("T")[0])
    ),
  ].sort();

  const selectedActivities = activities.filter((activity) => {
    if (!activity.date) {
      return false;
    }

    return activity.date.split("T")[0] === selectedDate;
  });

  const goToPreviousDay = () => {
    const [year, month, day] = selectedDate
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);

    const newDate =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const [year, month, day] = selectedDate
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);

    const newDate =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    setSelectedDate(newDate);
  };

  const transport = selectedActivities
    .filter((activity) => activity.type === "Transport")
    .reduce((total, activity) => total + activity.emissions, 0);

  const food = selectedActivities
    .filter((activity) => activity.type === "Food")
    .reduce((total, activity) => total + activity.emissions, 0);

  const energy = selectedActivities
    .filter((activity) => activity.type === "Energy")
    .reduce((total, activity) => total + activity.emissions, 0);
  const [dailyGoal] = useState(10);

  const getUnit = () => {
    if (activityType === "Transport") {
      return "km";
    }

    if (activityType === "Food") {
      return "meals";
    }

    if (activityType === "Energy") {
      return "kWh";
    }

    return "";
  };

  const handleAddActivity = async () => {
    const value = Number(amount);

    if (!value || value <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: activityType,
          amount: value,
        }),
      });

      const data = await response.json();



      const newActivity = {
        type: activityType,
        amount: value,
        emissions: data.emissions,
        date: new Date().toISOString(),
      };

      setActivities((previousActivities) => [
        ...previousActivities,
        newActivity,
      ]);

      setAmount("");
    } catch (error) {
      console.error("Error connecting to server:", error);
      alert("Could not connect to the server.");
    }
  };

  const handleDeleteActivity = (index) => {
    setActivities((previousActivities) =>
      previousActivities.filter((_, i) => i !== index)
    );
  };

  const handleEditActivity = (index) => {
    const activity = activities[index];

    setEditingIndex(index);
    setEditAmount(activity.amount);
  };

  const handleSaveEdit = async (index) => {
    const value = Number(editAmount);

    if (!value || value <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const activity = activities[index];

    try {
      const response = await fetch(
        "http://localhost:5000/api/calculate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: activity.type,
            amount: value,
          }),
        }
      );

      const data = await response.json();

      setActivities((previousActivities) =>
        previousActivities.map((item, i) =>
          i === index
            ? {
              ...item,
              amount: value,
              emissions: data.emissions,
            }
            : item
        )
      );

      setEditingIndex(null);
      setEditAmount("");
    } catch (error) {
      console.error("Error connecting to server:", error);
      alert("Could not connect to the server.");
    }
  };

  const handleClearActivities = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all activities?"
    );

    if (confirmed) {
      setActivities([]);
    }
  };

  const handleExportCSV = () => {
    if (activities.length === 0) {
      alert("There are no activities to export.");
      return;
    }

    const headers = [
      "Date",
      "Activity Type",
      "Amount",
      "Unit",
      "Carbon Emissions (kg CO2e)",
    ];

    const rows = activities.map((activity) => {
      let unit = "";

      if (activity.type === "Transport") {
        unit = "km";
      }

      if (activity.type === "Food") {
        unit = "meals";
      }

      if (activity.type === "Energy") {
        unit = "kWh";
      }

      return [
        new Date(activity.date).toLocaleString(),
        activity.type,
        activity.amount,
        unit,
        activity.emissions.toFixed(2),
      ];
    });

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "carbon-footprint-activities.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const total = transport + food + energy;
  const goalPercentage = Math.min((total / dailyGoal) * 100, 100);

  const chartData = {
    labels: ["Transport", "Food", "Energy"],
    datasets: [
      {
        label: "Carbon Footprint",
        data: [transport, food, energy],
        backgroundColor: [
          "#40b340",
          "#f79a30",
          "#392ccb",
        ],
        borderColor: "#fffdf8",
        borderWidth: 3,
      },
    ],
  };

  const getDateString = (date) => {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  };

  const selectedDateObject = (() => {
    const [year, month, day] = selectedDate
      .split("-")
      .map(Number);

    return new Date(year, month - 1, day);
  })();

  const weekDates = [];

  for (let i = -3; i <= 3; i++) {
    const date = new Date(selectedDateObject);
    date.setDate(date.getDate() + i);

    weekDates.push(getDateString(date));
  }

  const currentMonth = selectedDate.slice(0, 7);

  const monthlyActivities = activities.filter((activity) => {
    if (!activity.date) {
      return false;
    }

    return activity.date.slice(0, 7) === currentMonth;
  });

  const monthlyTotal = monthlyActivities.reduce(
    (total, activity) => total + activity.emissions,
    0
  );

  const monthlyTransport = monthlyActivities
    .filter((activity) => activity.type === "Transport")
    .reduce((total, activity) => total + activity.emissions, 0);

  const monthlyFood = monthlyActivities
    .filter((activity) => activity.type === "Food")
    .reduce((total, activity) => total + activity.emissions, 0);

  const monthlyEnergy = monthlyActivities
    .filter((activity) => activity.type === "Energy")
    .reduce((total, activity) => total + activity.emissions, 0);

  let monthlyTip = "";

  if (
    monthlyTransport >= monthlyFood &&
    monthlyTransport >= monthlyEnergy
  ) {
    monthlyTip =
      "Try walking, cycling, or using public transport for shorter trips to reduce transportation emissions.";
  } else if (
    monthlyFood >= monthlyTransport &&
    monthlyFood >= monthlyEnergy
  ) {
    monthlyTip =
      "Consider choosing more plant-based meals and reducing food waste to lower your food-related emissions.";
  } else {
    monthlyTip =
      "Switching off unused appliances and using energy-efficient devices can help reduce energy emissions.";
  }

  const monthlyDays = [
    ...new Set(
      monthlyActivities.map((activity) =>
        activity.date.split("T")[0]
      )
    ),
  ].sort();

  const monthlyDailyTotals = monthlyDays.map((date) => {
    return {
      date: date,
      total: monthlyActivities
        .filter(
          (activity) =>
            activity.date.split("T")[0] === date
        )
        .reduce(
          (total, activity) =>
            total + activity.emissions,
          0
        ),
    };
  });

  const averageDailyEmissions =
    monthlyDailyTotals.length > 0
      ? monthlyTotal / monthlyDailyTotals.length
      : 0;

  const highestEmissionDay =
    monthlyDailyTotals.length > 0
      ? monthlyDailyTotals.reduce((highest, current) =>
        current.total > highest.total
          ? current
          : highest
      )
      : null;



  const monthlyChartData = {
    labels: monthlyDays.map((date) =>
      new Date(`${date}T00:00:00`).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      )
    ),

    datasets: [
      {
        label: "Daily Carbon Footprint",
        data: monthlyDays.map((date) =>
          monthlyActivities
            .filter(
              (activity) =>
                activity.date.split("T")[0] === date
            )
            .reduce(
              (total, activity) =>
                total + activity.emissions,
              0
            )
        ),

        borderColor: "#315c43",
        backgroundColor: "rgba(49, 92, 67, 0.12)",
        tension: 0.3,
        fill: true,
        pointRadius: 5,
      },
    ],
  };

  return (
    <div className="app">

      <header className="header">
        <h1>🌿 Carbon Footprint Tracker</h1>
        <p>
          Small steps today, a greener tomorrow.
        </p>
      </header>

      <nav className="navbar">
        <button
          onClick={() =>
            document.getElementById("dashboard").scrollIntoView({
              behavior: "smooth",
            })
          }
        >
          🏠 Dashboard
        </button>

        <button
          onClick={() =>
            document.getElementById("monthly").scrollIntoView({
              behavior: "smooth",
            })
          }
        >
          📊 Monthly
        </button>

        <button
          onClick={() =>
            document.getElementById("history").scrollIntoView({
              behavior: "smooth",
            })
          }
        >
          📝 History
        </button>
      </nav>

      <main className="dashboard" id="dashboard">

        {/* TOTAL */}

        <section className="total-card">
          <h2>Today's Carbon Footprint</h2>

          <div className="total-value">
            {total.toFixed(2)} kg CO₂e
          </div>

          <p>
            Daily goal: {dailyGoal} kg CO₂e
          </p>

          <div className="goal-bar">
            <div
              className="goal-progress"
              style={{ width: `${goalPercentage}%` }}
            ></div>
          </div>

          <p className="goal-message">
            {total === 0 && "Start adding activities to track your impact 🌱"}

            {total > 0 && total < dailyGoal * 0.7 &&
              "You're doing great! Keep it up 🌿"}

            {total >= dailyGoal * 0.7 && total <= dailyGoal &&
              "You're getting close to your daily goal 🍃"}

            {total > dailyGoal &&
              "You've exceeded today's goal. Every small step helps 🌱"}
          </p>
        </section>


        {/* CATEGORY CARDS */}

        <section className="category-container">

          <div className="category-card">
            <div className="icon">🚗</div>

            <h3>Transport</h3>

            <p>
              {transport.toFixed(2)} kg CO₂e
            </p>
          </div>


          <div className="category-card">
            <div className="icon">🍽️</div>

            <h3>Food</h3>

            <p>
              {food.toFixed(2)} kg CO₂e
            </p>
          </div>


          <div className="category-card">
            <div className="icon">⚡</div>

            <h3>Energy</h3>

            <p>
              {energy.toFixed(2)} kg CO₂e
            </p>
          </div>

        </section>

        <section className="monthly-section" id="monthly">
          <h2>
            Monthly Summary
          </h2>

          <p className="monthly-title">
            {new Date(`${currentMonth}-01T00:00:00`).toLocaleDateString(
              "en-US",
              {
                month: "long",
                year: "numeric",
              }
            )}
          </p>

          <div className="monthly-cards">

            <div className="monthly-card">
              <span>🌱</span>
              <h3>Total Emissions</h3>
              <p>{monthlyTotal.toFixed(2)} kg CO₂e</p>
            </div>

            <div className="monthly-card">
              <span>🚗</span>
              <h3>Transport</h3>
              <p>{monthlyTransport.toFixed(2)} kg CO₂e</p>
            </div>

            <div className="monthly-card">
              <span>🍽️</span>
              <h3>Food</h3>
              <p>{monthlyFood.toFixed(2)} kg CO₂e</p>
            </div>

            <div className="monthly-card">
              <span>⚡</span>
              <h3>Energy</h3>
              <p>{monthlyEnergy.toFixed(2)} kg CO₂e</p>
            </div>

            <div className="monthly-card">
              <span>📊</span>
              <h3>Daily Average</h3>
              <p>
                {averageDailyEmissions.toFixed(2)} kg CO₂e
              </p>
            </div>

            <div className="monthly-card">
              <span>🔥</span>
              <h3>Highest Day</h3>

              <p>
                {highestEmissionDay
                  ? `${highestEmissionDay.total.toFixed(2)} kg CO₂e`
                  : "0.00 kg CO₂e"}
              </p>

              {highestEmissionDay && (
                <small>
                  {new Date(
                    `${highestEmissionDay.date}T00:00:00`
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </small>
              )}
            </div>

          </div>

          <p className="monthly-activity-count">
            {monthlyActivities.length} activities recorded this month
          </p>
        </section>

        <section className="monthly-chart-section">
          <h2>Monthly Carbon Trend</h2>

          {monthlyDays.length === 0 ? (
            <p className="no-monthly-data">
              Add activities to see your monthly carbon trend.
            </p>
          ) : (
            <div className="monthly-chart-container">
              <Line
                data={monthlyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,

                  plugins: {
                    legend: {
                      display: false,
                    },
                  },

                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: "kg CO₂e",
                      },
                    },

                    x: {
                      title: {
                        display: true,
                        text: "Date",
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </section>

        {/* ADD ACTIVITY */}

        <section className="activity-section">

          <h2>Add Activity</h2>

          <div className="form-container">

            <label>
              Activity Type

              <select
                value={activityType}
                onChange={(event) =>
                  setActivityType(event.target.value)
                }
              >
                <option>Transport</option>
                <option>Food</option>
                <option>Energy</option>
              </select>

            </label>


            <label>
              {activityType === "Transport" && "Distance (km)"}
              {activityType === "Food" && "Number of meals"}
              {activityType === "Energy" && "Energy used (kWh)"}

              <input
                type="number"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
                placeholder={`Enter ${getUnit()}`}
                min="0"
                step="0.1"
              />
            </label>


            <button onClick={handleAddActivity}>
              Add Activity
            </button>

          </div>

        </section>


        {/* CHART PLACEHOLDER */}

        <section className="chart-section">
          <h2>Carbon Footprint Overview</h2>

          <div className="chart-container">
            <Pie
              data={chartData}
              options={{
                plugins: {
                  legend: {
                    position: "bottom",
                  },
                },
              }}
            />
          </div>
        </section>

        <section className="tips-section">
          <div className="tips-icon">
            💡
          </div>

          <div>
            <h2>Carbon-Saving Tip</h2>

            <p>{monthlyTip}</p>
          </div>
        </section>

        <section className="history-section" id="history">
          <h2>Activity History</h2>
          <div className="date-navigation">

            <button
              className="day-navigation-button"
              onClick={goToPreviousDay}
            >
              ← Previous
            </button>

            <div className="selected-day">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              )}
            </div>

            <button
              className="day-navigation-button"
              onClick={goToNextDay}
            >
              Next →
            </button>

          </div>
          <div className="date-strip">
            {weekDates.map((date) => (
              <button
                key={date}
                className={`date-card ${selectedDate === date ? "selected-date" : ""
                  }`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="date-day">
                  {new Date(`${date}T00:00:00`).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                    }
                  )}
                </span>

                <span className="date-number">
                  {new Date(`${date}T00:00:00`).getDate()}
                </span>
              </button>
            ))}
          </div>

          {activities.length > 0 && (
            <>
              <button
                className="export-button"
                onClick={handleExportCSV}
              >
                📥 Export CSV
              </button>

              <button
                className="clear-button"
                onClick={handleClearActivities}
              >
                Clear All
              </button>
            </>
          )}
          {selectedActivities.length === 0 ? (
            <p className="empty-history">
              No activities recorded for this day.
            </p>
          ) : (
            <div className="activity-list">
              {selectedActivities.map((activity) => (
                <div
                  className="activity-item"
                  key={activity.date + activity.type + activity.amount}
                >
                  <div className="activity-info">

                    <div className="activity-icon">
                      {activity.type === "Transport" && "🚗"}
                      {activity.type === "Food" && "🍽️"}
                      {activity.type === "Energy" && "⚡"}
                    </div>

                    <div>
                      <strong>{activity.type}</strong>

                      {editingIndex === activities.indexOf(activity) ? (
                        <div className="edit-form">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(event) =>
                              setEditAmount(event.target.value)
                            }
                            min="0"
                            step="0.1"
                          />

                          <button
                            className="save-edit-button"
                            onClick={() =>
                              handleSaveEdit(activities.indexOf(activity))
                            }
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p>
                          {activity.amount}{" "}
                          {activity.type === "Transport" && "km"}
                          {activity.type === "Food" && "meals"}
                          {activity.type === "Energy" && "kWh"}
                        </p>
                      )}

                      <small className="activity-date">
                        {new Date(activity.date).toLocaleString()}
                      </small>
                    </div>

                  </div>

                  <div className="activity-actions">

                    <span>
                      {activity.emissions.toFixed(2)} kg CO₂e
                    </span>

                    <button
                      className="edit-button"
                      onClick={() =>
                        handleEditActivity(activities.indexOf(activity))
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDeleteActivity(activities.indexOf(activity))
                      }
                    >
                      Delete
                    </button>

                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="info-section">
          <h2>How EcoTrack Works</h2>

          <div className="info-cards">
            <div className="info-card">
              <div className="info-icon">📝</div>
              <h3>1. Add Activity</h3>
              <p>
                Enter your daily transport, food, or energy activity.
              </p>
            </div>

            <div className="info-card">
              <div className="info-icon">🌱</div>
              <h3>2. Calculate Impact</h3>
              <p>
                Our backend estimates the carbon impact of your activity.
              </p>
            </div>

            <div className="info-card">
              <div className="info-icon">📊</div>
              <h3>3. Track Progress</h3>
              <p>
                View your footprint, goal progress, chart, and history.
              </p>
            </div>
          </div>
        </section>

      </main>

      <footer className="footer">
        <p>🌿 EcoTrack — Small steps today, a greener tomorrow.</p>
        <span>Built with React, Node.js & Chart.js</span>
      </footer>
    </div>
  );
}

export default App;
