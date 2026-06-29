const DashboardModel = require("../model/DashboardModel");

const getCategory = async (req, res) => {
  try {
    const result = await DashboardModel.getCategory();
    res
      .status(200)
      .json({ status: 200, message: "Category list", data: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const result = await DashboardModel.getCategoryById(req.params.id);
    res
      .status(200)
      .json({ status: 200, message: "Category list", data: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

const addCategory = async (req, res) => {
  try {
    const result = await DashboardModel.addCategory(req.body);
    res
      .status(200)
      .json({ status: 200, message: "Category added", data: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const result = await DashboardModel.updateCategory(req.params.id, req.body);
    res
      .status(200)
      .json({ status: 200, message: "Category updated", data: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const result = await DashboardModel.deleteCategory(req.params.id);
    res
      .status(200)
      .json({ status: 200, message: "Category deleted", data: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const result = await DashboardModel.getDashboardSummary(req.body);
    res
      .status(200)
      .json({ status: 200, message: "Dashboard summary", data: result });
  } catch (error) {
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

module.exports = {
  getCategory,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  getDashboardSummary,
};
