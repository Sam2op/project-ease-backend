const Project = require('../models/Project');
const Request = require('../models/Request');

// @desc   Get all projects (including approved custom projects)
// @route  GET /api/projects
// @access Public
exports.getProjects = async (req, res, next) => {
  try {
    // Get regular projects
    const projects = await Project.find({ isActive:true })
      .sort({ createdAt: -1 });

    // Get approved custom requests that should be shown publicly
    const approvedCustomRequests = await Request.find({
      status: 'approved',
      customProject: { $exists: true },
      'customProject.showInCatalog': true
    })
      .populate('user', 'username')
      .select('customProject actualPrice estimatedPrice createdAt updatedAt')
      .sort({ updatedAt: -1 });

    // Transform custom projects to look like regular projects
    const customProjects = approvedCustomRequests.map(request => ({
      _id: request._id,
      name: request.customProject.name,
      description: request.customProject.description,
      category: request.customProject.category || 'other',
      price: request.actualPrice || request.estimatedPrice || 0,
      duration: request.customProject.timeline || 'TBD',
technologies: {
  frontend: project.technologies?.frontend || [],
  backend:  project.technologies?.backend  || [],
  database: project.technologies?.database || [],
  other:    project.technologies?.other    || []
},
images: project.images || []
,
      isCustomProject: true,
      createdBy: request.user,
      createdAt: request.createdAt
    }));

    // Combine and sort all projects
    const allProjects = [...projects, ...customProjects]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.status(200).json({ 
      success: true, 
      count: allProjects.length, 
      projects: allProjects 
    });
  } catch (err) {
    next(err);
  }
};

// @desc   Get single project by ID (detailed view)
// @route  GET /api/projects/:id
// @access Public
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// @desc   Create new project (admin)
// @route  POST /api/projects
// @access Private/Admin
exports.createProject = async (req, res, next) => {
  try {
    req.body.createdBy = req.user._id;
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// @desc   Update project (admin)
// @route  PUT /api/projects/:id
// @access Private/Admin
exports.updateProject = async (req, res, next) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid project ID format' 
      });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// @desc   Delete project (admin)
// @route  DELETE /api/projects/:id
// @access Private/Admin
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Project removed successfully' });
  } catch (err) {
    next(err);
  }
};
