
import React, { useState, useEffect } from 'react';
import { sendJudgePushNotification, fetchNotificationSchemas, saveNotificationSchema, deleteNotificationSchema } from '../../lib/api';

function emptyNotification() {
  return { title: '', body: '', recipients: [] };
}

function getTemplateSchemas(schemas) {
  return (schemas || []).filter((schema) => (schema.kind ?? 'template') === 'template');
}

function getScheduledSchemas(schemas) {
  return (schemas || []).filter((schema) => schema.kind === 'scheduled');
}

function sortSchemasOldestFirst(schemas) {
  return [...(schemas || [])].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return leftTime - rightTime;
  });
}

function formatScheduledDateTime(value) {
  if (!value) return 'No date set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function serializeScheduledDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function NotificationPanel({ contestants, token }) {
  const [notifications, setNotifications] = useState([emptyNotification()]);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notifyResult, setNotifyResult] = useState('');
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState('saved');
  const [templateName, setTemplateName] = useState('');
  const [notificationSchemas, setNotificationSchemas] = useState([]);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledName, setScheduledName] = useState('');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const savedTemplates = getTemplateSchemas(notificationSchemas);
  const scheduledNotifications = getScheduledSchemas(notificationSchemas);
  const visibleSchemas = activeSchemaTab === 'saved' ? savedTemplates : scheduledNotifications;


  useEffect(() => {
    if (!token) return;
    fetchNotificationSchemas(token)
      .then(res => setNotificationSchemas(sortSchemasOldestFirst(res.schemas)))
      .catch(() => setNotificationSchemas([]));
  }, [token]);


  async function handleSaveTemplate(name) {
    if (!name.trim()) return;
    try {
      await saveNotificationSchema(token, { name: name.trim(), notifications });
      setTemplateName('');
      setNotifyResult('Template saved!');
      const res = await fetchNotificationSchemas(token);
      setNotificationSchemas(sortSchemasOldestFirst(res.schemas));
    } catch (err) {
      setNotifyResult('Failed to save template.', err);
    }
  }

  function handleLoadTemplate(template) {
    setNotifications(template.notifications);
    setNotifyResult(`Loaded template: ${template.name}`);
  }


  async function handleDeleteTemplate(name) {
    try {
      await deleteNotificationSchema(token, name);
      setNotifyResult('Template deleted.');
      const res = await fetchNotificationSchemas(token);
      setNotificationSchemas(sortSchemasOldestFirst(res.schemas));
    } catch (err) {
      setNotifyResult('Failed to delete template.', err);
    }
  }

  function handleAddNotification() {
    const last = notifications[notifications.length - 1];
    if (!last.title.trim() || !last.body.trim()) return;
    setNotifications((prev) => [...prev, { title: '', body: '', recipients: [] }]);
  }
  function handleRemoveNotification(idx) {
    setNotifications((prev) => prev.filter((_, i) => i !== idx));
  }
  function handleNotificationChange(idx, field, value) {
    setNotifications((prev) => prev.map((n, i) => i === idx ? { ...n, [field]: value } : n));
  }
  function handleToggleRecipient(idx, username) {
    setNotifications((prev) => prev.map((n, i) => {
      if (i !== idx) return n;
      const recipients = n.recipients.includes(username)
        ? n.recipients.filter((u) => u !== username)
        : [...n.recipients, username];
      return { ...n, recipients };
    }));
  }
  async function actuallySendNotifications() {
    setIsSendingNotification(true);
    setNotifyResult('');
    try {
      let totalSent = 0, totalFailed = 0;
      for (const n of notifications) {
        const result = await sendJudgePushNotification(token, {
          title: n.title.trim(),
          body: n.body.trim(),
          recipients: n.recipients,
        });
        totalSent += result.sent || 0;
        totalFailed += result.failed || 0;
      }
      setNotifyResult(`Sent to ${totalSent} device(s).${totalFailed > 0 ? ` ${totalFailed} failed.` : ''}`);
      setNotifications([emptyNotification()]);
    } catch (sendError) {
      setNotifyResult(`Error: ${sendError.message}`);
    } finally {
      setIsSendingNotification(false);
    }
  }

  function handleSendAllNotifications(event) {
    event.preventDefault();
    const incomplete = notifications.some(n => !n.title.trim() || !n.body.trim() || n.recipients.length === 0);
    if (incomplete) {
      setNotifyResult('Please fill in title, message, and select at least one recipient for each notification.');
      return;
    }
    setShowSendConfirm(true);
  }
  return (
    <article className="task-meta-card" style={{ transition: 'max-height 0.3s, box-shadow 0.3s', overflow: 'hidden' }}>
      <div className="judge-section-header">
        <h2>Send Push Notifications</h2>
      </div>
      {!showNotificationForm ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 60 }}>
          <button className="button" onClick={() => setShowNotificationForm(true)}>
            Send Notifications
          </button>
        </div>
      ) : (
        <>
        <form className="auth-form" onSubmit={handleSendAllNotifications}>
          {notifications.map((n, idx) => (
            <div key={idx} className="notification-block" style={{ border: '1px solid #ccc', padding: 12, marginBottom: 16, borderRadius: 8 }}>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Title</label>
                <input
                  value={n.title}
                  onChange={e => handleNotificationChange(idx, 'title', e.target.value)}
                  placeholder="e.g. New Task!"
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Message</label>
                <input
                  value={n.body}
                  onChange={e => handleNotificationChange(idx, 'body', e.target.value)}
                  placeholder="e.g. A new task has been added. Check the app!"
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Recipients</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {contestants.map(username => {
                    const displayName = username.charAt(0).toUpperCase() + username.slice(1)
                    return (
                      <label key={username} className="custom-checkbox">
                        <input
                          type="checkbox"
                          checked={n.recipients.includes(username)}
                          onChange={() => handleToggleRecipient(idx, username)}
                        />
                        <span>{displayName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              {notifications.length > 1 && (
                <button type="button" className="button-ghost" onClick={() => handleRemoveNotification(idx)} style={{ marginTop: 8 }}>
                  Remove Notification
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="button-ghost"
            onClick={handleAddNotification}
            style={{ marginBottom: 16, display: 'block', width: 250, padding: '4px 0', fontSize: '0.92em', height: 32, lineHeight: '20px', border: '1.5px solid #ccc', color: 'inherit', textAlign: 'center' }}
            disabled={!(
              notifications[notifications.length-1].title.trim() &&
              notifications[notifications.length-1].body.trim() &&
              notifications[notifications.length-1].recipients.length > 0
            )}
          >
            Add Notification
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="button"
              type="submit"
              disabled={isSendingNotification || notifications.some(n => !n.title.trim() || !n.body.trim() || n.recipients.length === 0)}
            >
              <span aria-hidden="true" style={{ marginRight: 8 }}>✉</span>
              {isSendingNotification ? 'Sending…' : 'Send All Notifications'}
            </button>
            {showSendConfirm && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.35)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div
                  className="task-meta-card"
                  style={{
                    borderRadius: 14,
                    boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                    border: '1.5px solid #e0e0e0',
                    padding: '48px 40px 40px 40px',
                    minWidth: 420,
                    maxWidth: 520,
                    width: '90vw',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    color: '#fff',
                  }}
                >
                  <label style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#fff' }}>Send Notifications?</label>
                  <div style={{ fontSize: 17, marginBottom: 8 }}>
                    Are you sure you want to send notifications to <strong>{[...new Set(notifications.flatMap(n => n.recipients))].length}</strong> people?
                  </div>
                  <div style={{ display: 'flex', gap: 18, justifyContent: 'center', width: '100%', marginTop: 12 }}>
                    <button
                      type="button"
                      className="button"
                      disabled={isSendingNotification}
                      onClick={async () => {
                        setShowSendConfirm(false);
                        await actuallySendNotifications();
                      }}
                    >
                      {isSendingNotification ? 'Sending…' : 'Yes, Send'}
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => setShowSendConfirm(false)}
                      disabled={isSendingNotification}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              className="button notification-template-button"
              onClick={() => setShowTemplatePrompt(true)}
              style={{ minWidth: 120 }}
              disabled={notifications.length === 0 || notifications.every(n => !n.title.trim() && !n.body.trim() && n.recipients.length === 0)}
            >
              <span aria-hidden="true" style={{ marginRight: 8 }}>▣</span>
              Save As Template
            </button>
            <button
              type="button"
              className="button notification-schedule-button"
              onClick={() => setShowScheduleModal(true)}
              style={{ minWidth: 160, marginLeft: 8 }}
                      Close
            >
              <span aria-hidden="true" style={{ marginRight: 8 }}>◷</span>
              Schedule Notifications
            </button>
                    {showScheduleModal && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.35)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <div
                          className="task-meta-card"
                          style={{
                            borderRadius: 14,
                            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                            border: '1.5px solid #e0e0e0',
                            padding: '48px 40px 40px 40px',
                            minWidth: 420,
                            maxWidth: 520,
                            width: '90vw',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 24,
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            color: '#fff',
                          }}
                        >
                          <label style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#fff' }}>Schedule Notifications</label>
                          <div style={{ fontSize: 17, marginBottom: 8 }}>
                            Choose a date and time to send notifications to <strong>{[...new Set(notifications.flatMap(n => n.recipients))].length}</strong> people:
                          </div>
                          <input
                            type="text"
                            value={scheduledName}
                            onChange={e => setScheduledName(e.target.value)}
                            placeholder="Enter schedule name"
                            required
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #ccc',
                              fontSize: 16,
                              width: '100%',
                              color: '#222',
                            }}
                          />
                          <input
                            type="datetime-local"
                            value={scheduledDateTime}
                            onChange={e => setScheduledDateTime(e.target.value)}
                            required
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #ccc',
                              fontSize: 16,
                              marginBottom: 16,
                              width: '100%',
                              color: '#222',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', width: '100%', marginTop: 12 }}>
                            <button
                              type="button"
                              className="button"
                              style={{ minWidth: 100 }}
                              onClick={async () => {
                                const serializedScheduledFor = serializeScheduledDateTime(scheduledDateTime);

                                if (!serializedScheduledFor) {
                                  setNotifyResult('Please choose a valid scheduled date and time.');
                                  return;
                                }

                                try {
                                  await saveNotificationSchema(token, {
                                    name: scheduledName.trim(),
                                    notifications,
                                    kind: 'scheduled',
                                    scheduledFor: serializedScheduledFor,
                                  });
                                  setShowScheduleModal(false);
                                  setNotifyResult(`Scheduled ${scheduledName.trim()} for ${formatScheduledDateTime(serializedScheduledFor)}`);
                                  setScheduledName('');
                                  setScheduledDateTime('');
                                  setNotifications([emptyNotification()]);
                                  const res = await fetchNotificationSchemas(token);
                                  setNotificationSchemas(sortSchemasOldestFirst(res.schemas));
                                } catch (error) {
                                  setNotifyResult(`Failed to schedule notifications: ${error.message}`);
                                }
                              }}
                              disabled={!scheduledName.trim() || !scheduledDateTime}
                            >
                              Schedule
                            </button>
                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() => {
                                setShowScheduleModal(false);
                                setScheduledName('');
                                setScheduledDateTime('');
                              }}
                              style={{ minWidth: 100 }}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
            <button
              type="button"
              className="button-ghost"
              onClick={() => setShowNotificationForm(false)}
              style={{ minWidth: 80 }}
            >
              Close
            </button>
          </div>
        </form>
        {showTemplatePrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.35)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (templateName.trim()) {
                  handleSaveTemplate(templateName);
                  setShowTemplatePrompt(false);
                }
              }}
              className="task-meta-card"
              style={{
                borderRadius: 14,
                boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                border: '1.5px solid #e0e0e0',
                padding: '48px 40px 40px 40px',
                minWidth: 420,
                maxWidth: 520,
                width: '90vw',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#fff',
              }}
            >
              <label style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#fff' }}>Template Name</label>
              <input
                type="text"
                placeholder="Enter template name"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: 16,
                  borderRadius: 4,
                  border: '1.5px solid #ccc',
                  width: '100%',
                  maxWidth: 340,
                  margin: '0 auto',
                  background: '#fff',
                  color: '#222',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 18, justifyContent: 'center', width: '100%', marginTop: 12 }}>
                <button
                  type="submit"
                  className="button"
                  disabled={!templateName.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => setShowTemplatePrompt(false)}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="notification-schema-panel" style={{ marginTop: 32 }}>
          <div className="notification-schema-tabs" role="tablist" aria-label="Notification schema tabs">
            <button
              type="button"
              className={`notification-schema-tab${activeSchemaTab === 'saved' ? ' is-active' : ''}`}
              onClick={() => setActiveSchemaTab('saved')}
              role="tab"
              aria-selected={activeSchemaTab === 'saved'}
            >
              Saved Notifications ({savedTemplates.length})
            </button>
            <button
              type="button"
              className={`notification-schema-tab${activeSchemaTab === 'scheduled' ? ' is-active' : ''}`}
              onClick={() => setActiveSchemaTab('scheduled')}
              role="tab"
              aria-selected={activeSchemaTab === 'scheduled'}
            >
              Scheduled ({scheduledNotifications.length})
            </button>
          </div>
          <div className="notification-schema-list" role="tabpanel">
            {visibleSchemas.length === 0 && (
              <div className="muted">
                {activeSchemaTab === 'saved' ? 'No templates saved.' : 'No scheduled notifications.'}
              </div>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {visibleSchemas.map((schema) => (
                <li key={schema.name} className="notification-schema-list-item">
                  <span className="notification-schema-list-text">
                    <span>{schema.name}</span>
                    {activeSchemaTab === 'scheduled' ? (
                      <span className="muted notification-schema-list-meta">
                        {formatScheduledDateTime(schema.scheduledFor)}
                      </span>
                    ) : null}
                  </span>
                  <span className="notification-schema-actions">
                    <button type="button" className="button-ghost" onClick={() => handleLoadTemplate(schema)}>
                      Load
                    </button>
                    <button type="button" className="button-ghost" onClick={() => handleDeleteTemplate(schema.name)}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </>
      )}
    </article>
  );
}
