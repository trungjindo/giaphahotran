export const familyData = {
  id: "root_1",
  name: "Trần Đình Khởi",
  avatar: "https://i.pravatar.cc/150?u=tran_dinh_khoi",
  generation: 1,
  birthDate: "1850",
  deathDate: "1920",
  isAlive: false,
  isMainLineage: true,
  spouse: "Nguyễn Thị Hoa",
  location: "Nam Định",
  occupation: "Hương sư",
  description: "Thủy tổ của dòng họ Trần Đình tại Nam Định. Ông là người có học vấn uyên thâm, được cả làng kính trọng.",
  achievements: ["Người khai sáng dòng họ", "Lập nên quỹ khuyến học đầu tiên của làng"],
  children: [
    {
      id: "gen_2_1",
      name: "Trần Đình A",
      avatar: "https://i.pravatar.cc/150?u=tran_dinh_a",
      generation: 2,
      birthDate: "1880",
      deathDate: "1950",
      isAlive: false,
      isMainLineage: true,
      spouse: "Lê Thị Bích",
      location: "Nam Định",
      occupation: "Trưởng tộc, Điền chủ",
      description: "Tiếp nối truyền thống cha ông, ông đã mở rộng cơ ngơi và xây dựng nhà thờ tổ.",
      achievements: ["Xây dựng nhà thờ họ khang trang", "Đỗ tú tài năm 1905"],
      children: [
        {
          id: "gen_3_1",
          name: "Trần Đình X",
          avatar: "https://i.pravatar.cc/150?u=tran_dinh_x",
          generation: 3,
          birthDate: "1910",
          deathDate: "1980",
          isAlive: false,
          isMainLineage: true,
          spouse: "Phạm Thị Lan",
          location: "Hà Nội",
          occupation: "Giáo sư",
          description: "Người mang họ Trần Đình vươn xa ra thủ đô, một nhà giáo ưu tú.",
          achievements: ["Đạt học vị Tiến sĩ", "Được phong tặng danh hiệu Nhà giáo Nhân dân"],
          children: [
            {
              id: "gen_4_1",
              name: "Trần Đình Minh",
              avatar: "https://i.pravatar.cc/150?u=tran_dinh_minh",
              generation: 4,
              birthDate: "1945",
              deathDate: "",
              isAlive: true,
              isMainLineage: true,
              spouse: "Hoàng Thị Cúc",
              location: "Hà Nội",
              occupation: "Bác sĩ trưởng khoa",
              description: "Một bác sĩ tận tâm, cứu sống nhiều bệnh nhân nghèo.",
              achievements: ["Bác sĩ Ưu tú", "Giải thưởng cống hiến y học"],
              children: []
            }
          ]
        },
        {
          id: "gen_3_2",
          name: "Trần Đình Y",
          avatar: "https://i.pravatar.cc/150?u=tran_dinh_y",
          generation: 3,
          birthDate: "1915",
          deathDate: "1995",
          isAlive: false,
          isMainLineage: false,
          spouse: "Vũ Thị Sen",
          location: "Nam Định",
          occupation: "Thương gia",
          description: "Một người có tài kinh doanh, hỗ trợ rất nhiều cho quỹ họ.",
          achievements: ["Thương gia thành đạt", "Góp phần trùng tu nhà thờ họ"],
          children: []
        }
      ]
    },
    {
      id: "gen_2_2",
      name: "Trần Đình B",
      avatar: "https://i.pravatar.cc/150?u=tran_dinh_b",
      generation: 2,
      birthDate: "1885",
      deathDate: "1960",
      isAlive: false,
      isMainLineage: false,
      spouse: "Ngô Thị Lựu",
      location: "Thái Bình",
      occupation: "Thương gia",
      description: "Di cư sang Thái Bình và lập nghiệp thành công tại đây.",
      achievements: [],
      children: [
        {
            id: "gen_3_3",
            name: "Trần Đình C",
            avatar: "https://i.pravatar.cc/150?u=tran_dinh_c",
            generation: 3,
            birthDate: "1920",
            deathDate: "",
            isAlive: true,
            isMainLineage: false,
            spouse: "Trần Thị Đào",
            location: "TP.HCM",
            occupation: "Kỹ sư",
            description: "Ông đã vào miền Nam lập nghiệp và rất thành đạt.",
            achievements: ["Xây dựng thành công hệ thống cầu đường lớn"],
            children: []
        }
      ]
    }
  ]
};

export const financeData = {
  totalFund: 50000000,
  transactions: [
    { id: 1, date: "2024-01-15", type: "Thu", amount: 10000000, description: "Con cháu đóng góp quỹ năm mới", person: "Nhiều người" },
    { id: 2, date: "2024-03-10", type: "Chi", amount: 2000000, description: "Sửa chữa cổng nhà thờ họ", person: "Trần Đình X" },
    { id: 3, date: "2024-05-01", type: "Thu", amount: 5000000, description: "Ông Trần Đình Y tài trợ khuyến học", person: "Trần Đình Y" },
    { id: 4, date: "2024-08-15", type: "Chi", amount: 3000000, description: "Phát thưởng học sinh giỏi", person: "Ban Khuyến Học" }
  ]
};

export const newsData = [
  {
    id: 1,
    title: "Lễ tế Tổ mùa thu 2024",
    date: "2024-08-20",
    content: "Trân trọng kính mời toàn thể con cháu dòng họ Trần Đình về dự lễ tế tổ mùa thu. Đây là dịp để con cháu mọi miền tổ quốc tụ họp, báo công với tổ tiên và bàn bạc công việc của dòng họ.",
    image: "https://images.unsplash.com/photo-1600185966579-2479e0004f21?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    title: "Phát thưởng khuyến học 2024",
    date: "2024-08-15",
    content: "Hội đồng gia tộc đã tổ chức phát thưởng cho các cháu có thành tích học tập xuất sắc trong năm học vừa qua. Mong các cháu tiếp tục phát huy truyền thống hiếu học của dòng họ.",
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
  }
];
